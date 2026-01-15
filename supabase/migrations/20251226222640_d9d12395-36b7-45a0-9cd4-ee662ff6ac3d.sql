-- Drop problematic policies for family_members
DROP POLICY IF EXISTS "Family members can view their family" ON public.family_members;
DROP POLICY IF EXISTS "Family creators can add members" ON public.family_members;
DROP POLICY IF EXISTS "Family creators can remove members" ON public.family_members;

-- Drop problematic policies for family_groups
DROP POLICY IF EXISTS "Users can view their family groups" ON public.family_groups;

-- Recreate family_members policies without recursion
CREATE POLICY "Users can view own memberships" 
ON public.family_members 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can view family member list" 
ON public.family_members 
FOR SELECT 
USING (
  family_id IN (
    SELECT fm.family_id FROM public.family_members fm WHERE fm.user_id = auth.uid()
  )
);

CREATE POLICY "Family owners can add members" 
ON public.family_members 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() OR 
  family_id IN (
    SELECT fg.id FROM public.family_groups fg WHERE fg.created_by = auth.uid()
  )
);

CREATE POLICY "Family owners or self can remove members" 
ON public.family_members 
FOR DELETE 
USING (
  user_id = auth.uid() OR 
  family_id IN (
    SELECT fg.id FROM public.family_groups fg WHERE fg.created_by = auth.uid()
  )
);

-- Recreate family_groups SELECT policy without recursion
CREATE POLICY "Users can view their family groups" 
ON public.family_groups 
FOR SELECT 
USING (
  created_by = auth.uid() OR 
  id IN (
    SELECT fm.family_id FROM public.family_members fm WHERE fm.user_id = auth.uid()
  )
);