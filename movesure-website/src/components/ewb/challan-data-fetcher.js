import { useState, useEffect } from 'react';
import supabase from '../../app/utils/supabase';

export default function useChallanData(challanNo) {
  const [challanDetails, setChallanDetails] = useState(null);
  const [transitDetails, setTransitDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (challanNo) {
      fetchChallanData(challanNo);
    } else {
      setChallanDetails(null);
      setTransitDetails([]);
    }
  }, [challanNo]);

  const fetchChallanData = async (challanNo) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch challan details
      const { data: challanData, error: challanError } = await supabase
        .from('challan_details')
        .select('*')
        .eq('challan_no', challanNo)
        .single();

      if (challanError) throw challanError;

      // Fetch related data in parallel
      const [branchRes, truckRes, ownerRes, driverRes, transitRes] = await Promise.all([
        // Branch - fetch all columns since we don't know the exact structure
        challanData.branch_id
          ? supabase
              .from('branches')
              .select('*')
              .eq('id', challanData.branch_id)
              .single()
          : { data: null, error: null },
        
        // Truck
        challanData.truck_id 
          ? supabase
              .from('trucks')
              .select('*')
              .eq('id', challanData.truck_id)
              .single()
          : { data: null, error: null },
        
        // Owner
        challanData.owner_id
          ? supabase
              .from('staff')
              .select('*')
              .eq('id', challanData.owner_id)
              .single()
          : { data: null, error: null },
        
        // Driver
        challanData.driver_id
          ? supabase
              .from('staff')
              .select('*')
              .eq('id', challanData.driver_id)
              .single()
          : { data: null, error: null },
        
        // Transit details
        supabase
          .from('transit_details')
          .select('*')
          .eq('challan_no', challanNo)
          .order('gr_no', { ascending: true })
      ]);

      if (transitRes.error) throw transitRes.error;

      // Get all bilty IDs and GR numbers from transit details
      const biltyIds = transitRes.data
        .filter(t => t.bilty_id)
        .map(t => t.bilty_id);
      
      const grNumbers = transitRes.data
        .map(t => t.gr_no)
        .filter(Boolean);

      // Fetch bilty details and station summary in parallel
      const [biltyRes, stationRes] = await Promise.all([
        biltyIds.length > 0
          ? supabase
              .from('bilty')
              .select('*')
              .in('id', biltyIds)
          : { data: [], error: null },
        
        grNumbers.length > 0
          ? supabase
              .from('station_bilty_summary')
              .select('*')
              .in('gr_no', grNumbers)
          : { data: [], error: null }
      ]);

      if (biltyRes.error) {
        console.error('Bilty fetch error:', biltyRes.error);
      }
      
      if (stationRes.error) {
        console.error('Station summary fetch error:', stationRes.error);
      }

      const biltyData = biltyRes.data || [];
      const stationData = stationRes.data || [];

      // Get to_city_id from bilty records
      const toCityIdsFromBilty = biltyData
        .map(b => b.to_city_id)
        .filter(Boolean);

      // Fetch city details for to_city_id
      let cityData = [];
      if (toCityIdsFromBilty.length > 0) {
        const { data: cities, error: cityError } = await supabase
          .from('cities')
          .select('*')
          .in('id', toCityIdsFromBilty);

        if (cityError) {
          console.error('City fetch error:', cityError);
        } else {
          cityData = cities || [];
        }
      }

      // Map bilty, station, and city data to transit details
      const biltyMap = Object.fromEntries(biltyData.map(b => [b.id, b]));
      const stationMap = Object.fromEntries(stationData.map(s => [s.gr_no, s]));
      const cityMap = Object.fromEntries(cityData.map(c => [c.id, c]));
      
      const enrichedTransitDetails = transitRes.data.map(transit => {
        const biltyRecord = transit.bilty_id ? biltyMap[transit.bilty_id] : null;
        return {
          ...transit,
          bilty: biltyRecord,
          station: stationMap[transit.gr_no] || null,
          toCity: biltyRecord?.to_city_id ? cityMap[biltyRecord.to_city_id] : null
        };
      });

      // Enrich challan details
      const enrichedChallanDetails = {
        ...challanData,
        branch: branchRes.data,
        truck: truckRes.data,
        owner: ownerRes.data,
        driver: driverRes.data
      };

      setChallanDetails(enrichedChallanDetails);
      setTransitDetails(enrichedTransitDetails);
    } catch (err) {
      setError(err.message || 'Failed to fetch challan data');
      console.error('Error fetching challan data:', err);
    } finally {
      setLoading(false);
    }
  };

  return { challanDetails, transitDetails, loading, error, refetch: () => fetchChallanData(challanNo) };
}
