const express = require('express');
const { supabase } = require('../config/supabase');

const router = express.Router();

// Add a weight entry
router.post('/weight', async (req, res) => {
  try {
    const userId = req.user.id;
    const { weight, date } = req.body;

    if (!weight || !date) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Weight and date are required',
      });
    }

    // Validate weight is a positive number
    if (typeof weight !== 'number' || weight <= 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Weight must be a positive number',
      });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Date must be in YYYY-MM-DD format',
      });
    }

    const weightData = {
      user_id: userId,
      date,
      weight: Math.round(weight * 10) / 10, // Round to 1 decimal place
    };

    // Use upsert to handle duplicate dates
    const { data: weightRecord, error } = await supabase
      .from('weights')
      .upsert(weightData, { 
        onConflict: 'user_id,date',
        returning: 'representation'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to save weight entry',
      });
    }

    res.json({
      message: 'Weight entry saved successfully',
      weight_entry: weightRecord,
    });
  } catch (error) {
    console.error('Add weight error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add weight entry',
    });
  }
});

// Get weight entries
router.get('/weights', async (req, res) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date, limit = 100 } = req.query;

    let query = supabase
      .from('weights')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);

    // Apply date filters if provided
    if (start_date) {
      query = query.gte('date', start_date);
    }
    if (end_date) {
      query = query.lte('date', end_date);
    }

    const { data: weights, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to fetch weight entries',
      });
    }

    res.json(weights || []);
  } catch (error) {
    console.error('Get weights error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch weight entries',
    });
  }
});

// Update a weight entry
router.put('/weights/:date', async (req, res) => {
  try {
    const userId = req.user.id;
    const date = req.params.date;
    const { weight } = req.body;

    if (!weight) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Weight is required',
      });
    }

    // Validate weight is a positive number
    if (typeof weight !== 'number' || weight <= 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Weight must be a positive number',
      });
    }

    const { data: weightRecord, error } = await supabase
      .from('weights')
      .update({ 
        weight: Math.round(weight * 10) / 10,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('date', date)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Weight entry not found',
        });
      }
      console.error('Database error:', error);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to update weight entry',
      });
    }

    res.json({
      message: 'Weight entry updated successfully',
      weight_entry: weightRecord,
    });
  } catch (error) {
    console.error('Update weight error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update weight entry',
    });
  }
});

// Delete a weight entry
router.delete('/weights/:date', async (req, res) => {
  try {
    const userId = req.user.id;
    const date = req.params.date;

    const { data: weightRecord, error } = await supabase
      .from('weights')
      .delete()
      .eq('user_id', userId)
      .eq('date', date)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Weight entry not found',
        });
      }
      console.error('Database error:', error);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to delete weight entry',
      });
    }

    res.json({
      message: 'Weight entry deleted successfully',
      deleted_entry: weightRecord,
    });
  } catch (error) {
    console.error('Delete weight error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete weight entry',
    });
  }
});

module.exports = router;