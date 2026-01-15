import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Mail, Crown, Loader2, TrendingUp, ArrowUpRight, ArrowDownRight, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { useTranslation } from "react-i18next";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { toast } from "sonner";

interface FamilyGroup {
  id: string;
  name: string;
  created_by: string;
}

interface FamilyMember {
  id: string;
  user_id: string;
  role: string;
  profile?: {
    full_name: string | null;
  };
  email?: string;
}

interface SpendingData {
  user_id: string;
  name: string;
  total: number;
}

export default function Family() {
  const { user } = useAuth();
  const { isDemoMode, demoData } = useDemo();
  const { t } = useTranslation();
  const { formatCurrency } = useCurrencyFormat();
  const [family, setFamily] = useState<FamilyGroup | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [spendingData, setSpendingData] = useState<SpendingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  useEffect(() => {
    if (isDemoMode) {
      loadDemoFamily();
    } else if (user) {
      fetchFamily();
    }
  }, [user, isDemoMode]);

  const loadDemoFamily = () => {
    setFamily(demoData.family_group);
    setMembers(demoData.family_members);
    setSpendingData(demoData.family_spending);
    setLoading(false);
  };

  const fetchFamily = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Check if user is in a family
      const { data: memberData } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberData) {
        // Fetch family details
        const { data: familyData } = await supabase
          .from('family_groups')
          .select('*')
          .eq('id', memberData.family_id)
          .single();

        if (familyData) {
          setFamily(familyData);
          await fetchMembers(familyData.id);
          await fetchSpendingComparison(familyData.id);
        }
      }
    } catch (error) {
      console.error('Error fetching family:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (familyId: string) => {
    const { data } = await supabase
      .from('family_members')
      .select('id, user_id, role')
      .eq('family_id', familyId);

    if (data) {
      // Fetch profiles for members
      const memberIds = data.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', memberIds);

      const membersWithProfiles = data.map(member => ({
        ...member,
        profile: profiles?.find(p => p.id === member.user_id),
      }));

      setMembers(membersWithProfiles);
    }
  };

  const fetchSpendingComparison = async (familyId: string) => {
    if (!user) return;

    try {
      // Get family members
      const { data: memberData } = await supabase
        .from('family_members')
        .select('user_id')
        .eq('family_id', familyId);

      if (!memberData) return;

      const memberIds = memberData.map(m => m.user_id);

      // Get spending for each member (current month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const spending: SpendingData[] = [];

      for (const memberId of memberIds) {
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', memberId)
          .eq('transaction_type', 'expense')
          .gte('transaction_date', startOfMonth.toISOString().split('T')[0]);

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', memberId)
          .single();

        const total = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

        spending.push({
          user_id: memberId,
          name: profile?.full_name || 'User',
          total,
        });
      }

      setSpendingData(spending);
    } catch (error) {
      console.error('Error fetching spending:', error);
    }
  };

  const createFamily = async () => {
    if (!user || !familyName.trim()) return;

    setCreating(true);
    try {
      // Create family group
      const { data: newFamily, error: familyError } = await supabase
        .from('family_groups')
        .insert({
          name: familyName,
          created_by: user.id,
        })
        .select()
        .single();

      if (familyError) throw familyError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: newFamily.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      setFamily(newFamily);
      setMembers([{ id: '', user_id: user.id, role: 'owner' }]);
      setCreateDialogOpen(false);
      setFamilyName("");
      toast.success(t('family.createFamily'));
    } catch (error) {
      console.error('Error creating family:', error);
      toast.error('Failed to create family');
    } finally {
      setCreating(false);
    }
  };

  const sendInvite = async () => {
    if (!user || !family || !inviteEmail.trim()) return;

    setInviting(true);
    try {
      // Create invite in database
      const { data: inviteData, error } = await supabase
        .from('family_invites')
        .insert({
          family_id: family.id,
          invited_email: inviteEmail,
          invited_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Get inviter's profile name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const inviterName = profile?.full_name || user.email || 'Bir aile üyesi';

      // Send email via edge function
      const { error: emailError } = await supabase.functions.invoke('family-invite', {
        body: {
          inviteId: inviteData.id,
          invitedEmail: inviteEmail,
          familyName: family.name,
          inviterName: inviterName,
        },
      });

      if (emailError) {
        console.error('Email error:', emailError);
        // Don't throw - invite was created, just email failed
        toast.success(t('family.inviteSent'));
        toast.warning('Davet e-postası gönderilemedi');
      } else {
        toast.success(t('family.inviteSent'));
      }

      setInviteDialogOpen(false);
      setInviteEmail("");
    } catch (error) {
      console.error('Error sending invite:', error);
      toast.error('Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const totalFamilySpending = spendingData.reduce((sum, m) => sum + m.total, 0);
  const mySpending = spendingData.find(s => s.user_id === user?.id)?.total || 0;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('family.title')}</h1>
            {family && <p className="text-muted-foreground">{family.name}</p>}
          </div>
          {family && (
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('family.invite')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('family.inviteEmail')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                  <Button onClick={sendInvite} disabled={inviting || !inviteEmail}>
                    {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Mail className="h-4 w-4 mr-2" />
                    {t('family.invite')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {!family ? (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>{t('family.noFamily')}</CardTitle>
              <CardDescription>
                {t('family.createFamily')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Users className="h-4 w-4 mr-2" />
                    {t('family.createFamily')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('family.createFamily')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('family.familyName')}</Label>
                      <Input
                        value={familyName}
                        onChange={(e) => setFamilyName(e.target.value)}
                        placeholder="My Family"
                      />
                    </div>
                    <Button onClick={createFamily} disabled={creating || !familyName}>
                      {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {t('family.createFamily')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="members" className="space-y-6">
            <TabsList>
              <TabsTrigger value="members">
                <Users className="h-4 w-4 mr-2" />
                {t('family.members')}
              </TabsTrigger>
              <TabsTrigger value="comparison">
                <TrendingUp className="h-4 w-4 mr-2" />
                {t('family.comparison')}
              </TabsTrigger>
              <TabsTrigger value="shared">
                <Share2 className="h-4 w-4 mr-2" />
                {t('family.sharedAccounts')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('family.members')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id || member.user_id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {member.profile?.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.profile?.full_name || 'User'}
                              {member.user_id === user?.id && (
                                <span className="text-muted-foreground ml-1">(You)</span>
                              )}
                            </p>
                          </div>
                        </div>
                        {member.role === 'owner' && (
                          <Badge variant="secondary">
                            <Crown className="h-3 w-3 mr-1" />
                            Owner
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comparison" className="space-y-4">
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t('family.mySpending')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <ArrowDownRight className="h-5 w-5 text-red-500" />
                      <span className="text-2xl font-bold">{formatCurrency(mySpending)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t('family.familySpending')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-5 w-5 text-orange-500" />
                      <span className="text-2xl font-bold">{formatCurrency(totalFamilySpending)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Spending Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('family.comparison')}</CardTitle>
                  <CardDescription>This month's spending by family member</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {spendingData.map((member) => {
                    const percentage = totalFamilySpending > 0 
                      ? (member.total / totalFamilySpending) * 100 
                      : 0;

                    return (
                      <div key={member.user_id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {member.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {member.name}
                              {member.user_id === user?.id && (
                                <span className="text-muted-foreground ml-1">(You)</span>
                              )}
                            </span>
                          </div>
                          <span className="text-sm font-medium">
                            {formatCurrency(member.total)}
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        <p className="text-xs text-muted-foreground text-right">
                          {percentage.toFixed(1)}% of family spending
                        </p>
                      </div>
                    );
                  })}

                  {spendingData.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No spending data available
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="shared" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('family.sharedAccounts')}</CardTitle>
                  <CardDescription>
                    Accounts shared with your family
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No shared accounts yet. Share accounts from the Accounts page.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}
