export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      stops: {
        Row: {
          id: string;
          name: string;
          kind: string;
          lat: number;
          lng: number;
          geofence_radius_m: number;
          order_index: number;
        };
        Insert: {
          id?: string;
          name: string;
          kind: string;
          lat: number;
          lng: number;
          geofence_radius_m?: number;
          order_index?: number;
        };
        Update: {
          id?: string;
          name?: string;
          kind?: string;
          lat?: number;
          lng?: number;
          geofence_radius_m?: number;
          order_index?: number;
        };
        Relationships: [];
      };
      students: {
        Row: {
          user_id: string;
          student_number: string;
          full_name: string;
          hostel_stop_id: string;
        };
        Insert: {
          user_id: string;
          student_number: string;
          full_name: string;
          hostel_stop_id: string;
        };
        Update: {
          user_id?: string;
          student_number?: string;
          full_name?: string;
          hostel_stop_id?: string;
        };
        Relationships: [];
      };
      drivers: {
        Row: {
          user_id: string;
          driver_number: string;
          full_name: string;
          carrier: string;
        };
        Insert: {
          user_id: string;
          driver_number: string;
          full_name: string;
          carrier?: string;
        };
        Update: {
          user_id?: string;
          driver_number?: string;
          full_name?: string;
          carrier?: string;
        };
        Relationships: [];
      };
      shuttle_sessions: {
        Row: {
          id: string;
          driver_id: string;
          trip_type: string;
          status: string;
          signal: string;
          started_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          driver_id: string;
          trip_type: string;
          status?: string;
          signal?: string;
          started_at?: string;
          ended_at?: string | null;
        };
        Update: {
          id?: string;
          driver_id?: string;
          trip_type?: string;
          status?: string;
          signal?: string;
          started_at?: string;
          ended_at?: string | null;
        };
        Relationships: [];
      };
      shuttle_locations: {
        Row: {
          id: string;
          session_id: string;
          lat: number;
          lng: number;
          heading: number | null;
          speed: number | null;
          accuracy: number | null;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          lat: number;
          lng: number;
          heading?: number | null;
          speed?: number | null;
          accuracy?: number | null;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          lat?: number;
          lng?: number;
          heading?: number | null;
          speed?: number | null;
          accuracy?: number | null;
          recorded_at?: string;
        };
        Relationships: [];
      };
      pickup_requests: {
        Row: {
          id: string;
          student_id: string;
          stop_id: string;
          status: string;
          created_at: string;
          dispatched_at: string | null;
          expires_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          stop_id: string;
          status?: string;
          created_at?: string;
          dispatched_at?: string | null;
          expires_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          stop_id?: string;
          status?: string;
          created_at?: string;
          dispatched_at?: string | null;
          expires_at?: string;
        };
        Relationships: [];
      };
      dispatch_alerts: {
        Row: {
          id: string;
          stop_id: string;
          session_id: string | null;
          request_count: number;
          triggered_at: string;
          claimed_at: string | null;
        };
        Insert: {
          id?: string;
          stop_id: string;
          session_id?: string | null;
          request_count: number;
          triggered_at?: string;
          claimed_at?: string | null;
        };
        Update: {
          id?: string;
          stop_id?: string;
          session_id?: string | null;
          request_count?: number;
          triggered_at?: string;
          claimed_at?: string | null;
        };
        Relationships: [];
      };
      deadzones: {
        Row: {
          id: string;
          name: string;
          lat: number;
          lng: number;
          radius_m: number;
          notes: string;
        };
        Insert: {
          id?: string;
          name: string;
          lat: number;
          lng: number;
          radius_m: number;
          notes?: string;
        };
        Update: {
          id?: string;
          name?: string;
          lat?: number;
          lng?: number;
          radius_m?: number;
          notes?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
