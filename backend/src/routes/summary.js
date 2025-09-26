const express = require('express');
const { supabase } = require('../config/supabase');

const router = express.Router();

// Get daily nutrition summary
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Date parameter is required (YYYY-MM-DD format)',
      });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Date must be in YYYY-MM-DD format',
      });
    }

    // Get user's goals
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('goal_calories, goal_protein, goal_carbs, goal_fat')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('User fetch error:', userError);
      // Use default goals if user profile doesn't exist
    }

    const goals = {
      goal_calories: user?.goal_calories || 2000,
      goal_protein: user?.goal_protein || 150,
      goal_carbs: user?.goal_carbs || 250,
      goal_fat: user?.goal_fat || 67,
    };

    // Get meals for the specified date
    const startDateTime = `${date}T00:00:00.000Z`;
    const endDateTime = `${date}T23:59:59.999Z`;

    const { data: meals, error: mealsError } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .gte('datetime', startDateTime)
      .lte('datetime', endDateTime)
      .order('datetime', { ascending: true });

    if (mealsError) {
      console.error('Meals fetch error:', mealsError);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to fetch meals',
      });
    }

    // Calculate totals
    const totals = (meals || []).reduce(
      (acc, meal) => ({
        total_calories: acc.total_calories + (meal.calories || 0),
        total_protein: acc.total_protein + (meal.protein_g || 0),
        total_carbs: acc.total_carbs + (meal.carbs_g || 0),
        total_fat: acc.total_fat + (meal.fat_g || 0),
        total_fiber: acc.total_fiber + (meal.fiber_g || 0),
        total_sugar: acc.total_sugar + (meal.sugar_g || 0),
        total_sodium: acc.total_sodium + (meal.sodium_mg || 0),
      }),
      {
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
        total_fiber: 0,
        total_sugar: 0,
        total_sodium: 0,
      }
    );

    // Round values to 1 decimal place
    Object.keys(totals).forEach(key => {
      totals[key] = Math.round(totals[key] * 10) / 10;
    });

    // Calculate remaining values
    const remaining = {
      calories_remaining: Math.max(0, goals.goal_calories - totals.total_calories),
      protein_remaining: Math.max(0, goals.goal_protein - totals.total_protein),
      carbs_remaining: Math.max(0, goals.goal_carbs - totals.total_carbs),
      fat_remaining: Math.max(0, goals.goal_fat - totals.total_fat),
    };

    // Calculate percentages
    const percentages = {
      calories_percent: goals.goal_calories > 0 ? Math.round((totals.total_calories / goals.goal_calories) * 100) : 0,
      protein_percent: goals.goal_protein > 0 ? Math.round((totals.total_protein / goals.goal_protein) * 100) : 0,
      carbs_percent: goals.goal_carbs > 0 ? Math.round((totals.total_carbs / goals.goal_carbs) * 100) : 0,
      fat_percent: goals.goal_fat > 0 ? Math.round((totals.total_fat / goals.goal_fat) * 100) : 0,
    };

    const summary = {
      date,
      meal_count: meals?.length || 0,
      ...totals,
      ...goals,
      ...remaining,
      ...percentages,
      meals: meals || [],
    };

    res.json(summary);
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch daily summary',
    });
  }
});

// Get nutrition trends (weekly/monthly summaries)
router.get('/trends', async (req, res) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date, period = 'daily' } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'start_date and end_date parameters are required',
      });
    }

    // Validate period
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'period must be one of: daily, weekly, monthly',
      });
    }

    const startDateTime = `${start_date}T00:00:00.000Z`;
    const endDateTime = `${end_date}T23:59:59.999Z`;

    // Get all meals in the date range
    const { data: meals, error } = await supabase
      .from('meals')
      .select('datetime, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg')
      .eq('user_id', userId)
      .gte('datetime', startDateTime)
      .lte('datetime', endDateTime)
      .order('datetime', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to fetch meals for trends',
      });
    }

    // Group meals by period
    const groupedData = {};
    
    (meals || []).forEach(meal => {
      const mealDate = new Date(meal.datetime);
      let key;

      switch (period) {
        case 'daily':
          key = mealDate.toISOString().split('T')[0];
          break;
        case 'weekly':
          const startOfWeek = new Date(mealDate);
          startOfWeek.setDate(mealDate.getDate() - mealDate.getDay());
          key = startOfWeek.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${mealDate.getFullYear()}-${String(mealDate.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      if (!groupedData[key]) {
        groupedData[key] = {
          period: key,
          meal_count: 0,
          total_calories: 0,
          total_protein: 0,
          total_carbs: 0,
          total_fat: 0,
          total_fiber: 0,
          total_sugar: 0,
          total_sodium: 0,
        };
      }

      groupedData[key].meal_count++;
      groupedData[key].total_calories += meal.calories || 0;
      groupedData[key].total_protein += meal.protein_g || 0;
      groupedData[key].total_carbs += meal.carbs_g || 0;
      groupedData[key].total_fat += meal.fat_g || 0;
      groupedData[key].total_fiber += meal.fiber_g || 0;
      groupedData[key].total_sugar += meal.sugar_g || 0;
      groupedData[key].total_sodium += meal.sodium_mg || 0;
    });

    // Convert to array and round values
    const trends = Object.values(groupedData).map(item => {
      const rounded = { ...item };
      ['total_calories', 'total_protein', 'total_carbs', 'total_fat', 'total_fiber', 'total_sugar', 'total_sodium'].forEach(key => {
        rounded[key] = Math.round(rounded[key] * 10) / 10;
      });
      return rounded;
    });

    res.json({
      period,
      start_date,
      end_date,
      trends,
    });
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch nutrition trends',
    });
  }
});

module.exports = router;