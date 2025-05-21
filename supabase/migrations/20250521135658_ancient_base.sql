/*
  # Fix chats table RLS

  1. Changes
    - Add user_id column to chats table
    - Update RLS policy to properly handle user ownership

  2. Security
    - Update RLS policy to properly check user ownership
    - Ensure users can only manage their own chats
*/

-- Add user_id column to chats table
ALTER TABLE chats 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage their own chats" ON chats;

-- Create new policy that properly checks user ownership
CREATE POLICY "Users can manage their own chats"
  ON chats
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update chat_messages policy to use the new user_id relationship
DROP POLICY IF EXISTS "Users can manage their chat messages" ON chat_messages;

CREATE POLICY "Users can manage their chat messages"
  ON chat_messages
  FOR ALL
  TO authenticated
  USING (
    chat_id IN (
      SELECT id FROM chats
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    chat_id IN (
      SELECT id FROM chats
      WHERE user_id = auth.uid()
    )
  );