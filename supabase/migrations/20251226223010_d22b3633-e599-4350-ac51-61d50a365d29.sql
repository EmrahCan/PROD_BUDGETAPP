-- Fix infinite recursion in RLS for family tables by using SECURITY DEFINER helpers

-- 1) Helper functions
CREATE OR REPLACE FUNCTION public.is_family_member(_family_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE family_id = _family_id
      AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_family_owner(_family_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_groups
    WHERE id = _family_id
      AND created_by = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_valid_family_invite(_family_id uuid, _email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_invites
    WHERE family_id = _family_id
      AND lower(invited_email) = lower(_email)
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- 2) Replace family_members policies
DROP POLICY IF EXISTS "Users can view own memberships" ON public.family_members;
DROP POLICY IF EXISTS "Users can view family member list" ON public.family_members;
DROP POLICY IF EXISTS "Family owners can add members" ON public.family_members;
DROP POLICY IF EXISTS "Family owners or self can remove members" ON public.family_members;

CREATE POLICY "Family members can view members" 
ON public.family_members
FOR SELECT
USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family owners can add members" 
ON public.family_members
FOR INSERT
WITH CHECK (
  public.is_family_owner(family_id, auth.uid())
  OR (
    user_id = auth.uid()
    AND public.has_valid_family_invite(family_id, (auth.jwt() ->> 'email'))
  )
);

CREATE POLICY "Family owners or self can remove members" 
ON public.family_members
FOR DELETE
USING (
  user_id = auth.uid()
  OR public.is_family_owner(family_id, auth.uid())
);

-- 3) Replace family_groups select policy
DROP POLICY IF EXISTS "Users can view their family groups" ON public.family_groups;

CREATE POLICY "Users can view their family groups" 
ON public.family_groups
FOR SELECT
USING (
  created_by = auth.uid()
  OR public.is_family_member(id, auth.uid())
);