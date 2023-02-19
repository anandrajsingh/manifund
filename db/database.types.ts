export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bids: {
        Row: {
          amount: number | null
          bidder: string
          created_at: string | null
          id: string
          project: string
          valuation: number | null
        }
        Insert: {
          amount?: number | null
          bidder: string
          created_at?: string | null
          id?: string
          project: string
          valuation?: number | null
        }
        Update: {
          amount?: number | null
          bidder?: string
          created_at?: string | null
          id?: string
          project?: string
          valuation?: number | null
        }
      }
      posts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          title: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          title?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          title?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          username: string | null
        }
        Insert: {
          id: string
          username?: string | null
        }
        Update: {
          id?: string
          username?: string | null
        }
      }
      projects: {
        Row: {
          blurb: string | null
          created_at: string | null
          creator: string
          founder_portion: number
          id: string
          min_funding: number
          slug: string
          tags: string | null
          title: string | null
        }
        Insert: {
          blurb?: string | null
          created_at?: string | null
          creator: string
          founder_portion: number
          id?: string
          min_funding: number
          slug?: string
          tags?: string | null
          title?: string | null
        }
        Update: {
          blurb?: string | null
          created_at?: string | null
          creator?: string
          founder_portion?: number
          id?: string
          min_funding?: number
          slug?: string
          tags?: string | null
          title?: string | null
        }
      }
      txns: {
        Row: {
          amount: number
          created_at: string
          from_id: string
          id: string
          to_id: string
          token: string
        }
        Insert: {
          amount: number
          created_at?: string
          from_id: string
          id?: string
          to_id: string
          token: string
        }
        Update: {
          amount?: number
          created_at?: string
          from_id?: string
          id?: string
          to_id?: string
          token?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}