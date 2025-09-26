const express = require('express');
const sharp = require('sharp');
const { model } = require('../config/gemini');
const { supabase } = require('../config/supabase');

const router = express.Router();

// Food analysis prompt template
const FOOD_ANALYSIS_PROMPT = `
Analyze this food image and provide detailed nutritional information. 

Please respond with ONLY a valid JSON object (no additional text) with the following structure:
{
  "food_item": "Name of the food item",
  "portion": "Estimated portion size (e.g., '1 plate', '2 slices', '1 cup')",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "sugar_g": number,
  "sodium_mg": number,
  "confidence_score": number (0.0 to 1.0, how confident you are in this analysis)
}

Guidelines:
- Be as accurate as possible with nutritional estimates
- Use common portion sizes that people would understand
- If you can't identify the food clearly, set confidence_score below 0.5
- For mixed dishes, provide nutritional info for the entire visible portion
- Include all visible food items in the analysis
`;

router.post('/analyze-food', async (req, res) => {
  try {
    const { image, metadata } = req.body;
    const userId = req.user.id;

    if (!image) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Image data is required',
      });
    }

    // Process the image
    let imageBuffer;
    try {
      // Remove data URL prefix if present
      const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Optimize image size and format
      imageBuffer = await sharp(imageBuffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      console.error('Image processing error:', error);
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid image format',
      });
    }

    // Upload image to Supabase Storage
    const fileName = `${userId}/${Date.now()}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('meal-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Image upload error:', uploadError);
      return res.status(500).json({
        error: 'Storage Error',
        message: 'Failed to upload image',
      });
    }

    // Get public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('meal-images')
      .getPublicUrl(fileName);

    // Analyze with Gemini
    try {
      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/jpeg',
        },
      };

      const result = await model.generateContent([FOOD_ANALYSIS_PROMPT, imagePart]);
      const response = await result.response;
      const text = response.text();

      // Parse the JSON response
      let nutritionData;
      try {
        // Clean the response text to extract JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        nutritionData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        console.error('Raw response:', text);
        return res.status(500).json({
          error: 'AI Analysis Error',
          message: 'Failed to parse nutrition data from AI response',
        });
      }

      // Validate required fields
      const requiredFields = ['food_item', 'portion', 'calories', 'protein_g', 'carbs_g', 'fat_g'];
      for (const field of requiredFields) {
        if (nutritionData[field] === undefined || nutritionData[field] === null) {
          console.error(`Missing required field: ${field}`);
          return res.status(500).json({
            error: 'AI Analysis Error',
            message: 'Incomplete nutrition data from AI analysis',
          });
        }
      }

      // Store the meal record in the database
      const mealData = {
        user_id: userId,
        datetime: new Date().toISOString(),
        food_item: nutritionData.food_item,
        portion: nutritionData.portion,
        calories: Math.round(nutritionData.calories),
        protein_g: Math.round(nutritionData.protein_g * 10) / 10,
        carbs_g: Math.round(nutritionData.carbs_g * 10) / 10,
        fat_g: Math.round(nutritionData.fat_g * 10) / 10,
        fiber_g: nutritionData.fiber_g || 0,
        sugar_g: nutritionData.sugar_g || 0,
        sodium_mg: nutritionData.sodium_mg || 0,
        image_url: publicUrl,
        confidence_score: nutritionData.confidence_score || 0.8,
        gemini_raw_response: text,
      };

      const { data: mealRecord, error: dbError } = await supabase
        .from('meals')
        .insert(mealData)
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        return res.status(500).json({
          error: 'Database Error',
          message: 'Failed to save meal record',
        });
      }

      // Return the analysis result
      res.json({
        ...nutritionData,
        image_url: publicUrl,
        meal_id: mealRecord.id,
      });

    } catch (aiError) {
      console.error('Gemini AI error:', aiError);
      return res.status(500).json({
        error: 'AI Analysis Error',
        message: 'Failed to analyze food image',
      });
    }

  } catch (error) {
    console.error('Food analysis error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process food analysis request',
    });
  }
});

module.exports = router;