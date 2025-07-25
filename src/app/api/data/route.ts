
import {NextRequest, NextResponse} from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { initialProductsData, initialUsersData, initialSettings } from '@/lib/initial-data';

/**
 * Handles GET requests to fetch the current state of all data from Supabase.
 */
export async function GET() {
  try {
    const { data: products, error: productsError } = await supabase.from('products').select('*');
    if (productsError) throw productsError;

    const { data: users, error: usersError } = await supabase.from('users').select('*');
    if (usersError) throw usersError;

    const { data: orders, error: ordersError } = await supabase.from('orders').select('*');
    if (ordersError) throw ordersError;
    
    const { data: settings, error: settingsError } = await supabase.from('settings').select('*');
    if (settingsError) throw settingsError;

    // Supabase returns an array, we want the first (and only) settings object
    const settingsObject = settings && settings.length > 0 ? settings[0] : null;

    // Fallback logic: if a table is empty, populate it with initial data
    let finalProducts = products;
    if (!products || products.length === 0) {
        const { data } = await supabase.from('products').insert(initialProductsData).select();
        finalProducts = data || [];
    }
    
    let finalUsers = users;
    if (!users || users.length === 0) {
        const { data } = await supabase.from('users').insert(initialUsersData).select();
        finalUsers = data || [];
    }

    let finalSettings = settingsObject;
    if (!settingsObject) {
         const { data } = await supabase.from('settings').insert(initialSettings).select();
         finalSettings = data && data.length > 0 ? data[0] : initialSettings;
    }

    return NextResponse.json({
        products: finalProducts,
        users: finalUsers,
        orders: orders || [],
        settings: finalSettings
    });
  } catch(error) {
      console.error("Error fetching data from Supabase:", error);
      // If fetching fails entirely, return a default empty state
       return NextResponse.json({
          products: initialProductsData,
          users: initialUsersData,
          orders: [],
          settings: initialSettings,
       }, { status: 500 });
  }
}

/**
 * Handles POST requests to update the state of the data in Supabase.
 * This function is designed to be idempotent and robust.
 */
export async function POST(request: NextRequest) {
  try {
    const { products, users, orders, settings } = await request.json();

    // Upsert all data. 'upsert' will insert if the record doesn't exist
    // or update it if it does, based on the primary key.
    if (products) {
        const { error } = await supabase.from('products').upsert(products);
        if (error) throw error;
    }
    if (users) {
        const { error } = await supabase.from('users').upsert(users);
        if (error) throw error;
    }
    if (orders) {
        const { error } = await supabase.from('orders').upsert(orders);
        if (error) throw error;
    }
    if (settings) {
        // Settings are a single record, typically with id=1
        const { error } = await supabase.from('settings').upsert(settings);
        if (error) throw error;
    }

    return NextResponse.json({status: 'success'});
  } catch (error) {
    console.error("Error writing data to Supabase:", error);
    return NextResponse.json({status: 'error', message: 'Failed to write data' }, {status: 500});
  }
}
