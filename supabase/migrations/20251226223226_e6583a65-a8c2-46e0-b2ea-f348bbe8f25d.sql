-- Drop and recreate the INSERT policy to allow the creator to add themselves as the first member
DROP POLICY IF EXISTS "Family owners can add members" ON public.family_members;

CREATE POLICY "Family owners can add members" 
ON public.family_members
FOR INSERT
WITH CHECK (
  -- Allow owner to add members (use family_groups directly since no member exists yet)
  EXISTS (
    SELECT 1 FROM public.family_groups fg 
    WHERE fg.id = family_id AND fg.created_by = auth.uid()
  )
  OR (
    -- Allow user to join if they have a valid invite
    user_id = auth.uid()
    AND public.has_valid_family_invite(family_id, (auth.jwt() ->> 'email'))
  )
);