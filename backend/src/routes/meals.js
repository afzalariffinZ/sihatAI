const express = require('express');
const { supabase } = require('../config/supabase');

const router = express.Router();

// Get user's meals
router.get('/meals', async (req, res) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .order('datetime', { ascending: false });

    // Apply date filters if provided
    if (start_date) {
      query = query.gte('datetime', `${start_date}T00:00:00.000Z`);
    }
    if (end_date) {
      query = query.lte('datetime', `${end_date}T23:59:59.999Z`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: meals, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to fetch meals',
      });
    }

    res.json(meals || []);
  } catch (error) {
    console.error('Get meals error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch meals',
    });
  }
});

// Get a specific meal
router.get('/meals/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const mealId = req.params.id;

    const { data: meal, error } = await supabase
      .from('meals')
      .select('*')
      .eq('id', mealId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Meal not found',
        });
      }
      console.error('Database error:', error);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to fetch meal',
      });
    }

    res.json(meal);
  } catch (error) {
    console.error('Get meal error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch meal',
    });
  }
});

// Update a meal
router.put('/meals/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const mealId = req.params.id;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.user_id;
    delete updateData.created_at;
    delete updateData.gemini_raw_response;

    // Add updated timestamp
    updateData.updated_at = new Date().toISOString();

    const { data: meal, error } = await supabase
      .from('meals')
      .update(updateData)
      .eq('id', mealId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Meal not found',
        });
      }
      console.error('Database error:', error);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to update meal',
      });
    }

    res.json(meal);
  } catch (error) {
    console.error('Update meal error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update meal',
    });
  }
});

// Delete a meal
router.delete('/meals/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const mealId = req.params.id;

    // First, get the meal to check if it exists and get image URL
    const { data: meal, error: fetchError } = await supabase
      .from('meals')
      .select('*')
      .eq('id', mealId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Meal not found',
        });
      }
      console.error('Database error:', fetchError);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to fetch meal',
      });
    }

    // Delete the meal record
    const { error: deleteError } = await supabase
      .from('meals')
      .delete()
      .eq('id', mealId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Database error:', deleteError);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to delete meal',
      });
    }

    // Try to delete the associated image from storage
    if (meal.image_url) {
      try {
        const urlParts = meal.image_url.split('/');
        const fileName = `${userId}/${urlParts[urlParts.length - 1]}`;
        
        await supabase.storage
          .from('meal-images')
          .remove([fileName]);
      } catch (storageError) {
        console.error('Storage cleanup error:', storageError);
        // Don't fail the request if image cleanup fails
      }
    }

    res.json({
      message: 'Meal deleted successfully',
      deleted_meal: meal,
    });
  } catch (error) {
    console.error('Delete meal error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete meal',
    });
  }
});

module.exports = router;