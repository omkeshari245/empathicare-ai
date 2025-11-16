import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Calendar, TrendingUp, Heart, Activity, BarChart3, Droplets, Moon } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface MoodEntry {
  id: string;
  mood: string;
  emoji: string;
  date: Date;
  note?: string;
  energy?: number;
  sleep?: number;
  stress?: number;
}

interface HealthMetrics {
  date: string;
  mood: number;
  energy: number;
  sleep: number;
  stress: number;
  hydration: number;
}

const moodOptions = [
  { emoji: "😄", label: "Amazing", value: "amazing", color: "bg-success", score: 5 },
  { emoji: "😊", label: "Good", value: "good", color: "bg-primary", score: 4 },
  { emoji: "😐", label: "Okay", value: "okay", color: "bg-warning", score: 3 },
  { emoji: "😔", label: "Low", value: "low", color: "bg-accent", score: 2 },
  { emoji: "😢", label: "Struggling", value: "struggling", color: "bg-destructive", score: 1 },
];

const chartConfig = {
  mood: {
    label: "Mood",
    color: "hsl(var(--primary))",
  },
  energy: {
    label: "Energy",
    color: "hsl(var(--success))",
  },
  sleep: {
    label: "Sleep Quality",
    color: "hsl(var(--accent))",
  },
  stress: {
    label: "Stress Level",
    color: "hsl(var(--warning))",
  },
};

const Mood = () => {
  const [selectedMood, setSelectedMood] = useState<string>("");
  const [energyLevel, setEnergyLevel] = useState<number>(3);
  const [sleepQuality, setSleepQuality] = useState<number>(3);
  const [stressLevel, setStressLevel] = useState<number>(3);
  const [hydrationLevel, setHydrationLevel] = useState<number>(85);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch mood entries from Supabase
  useEffect(() => {
    const fetchMoodEntries = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching mood entries:', error);
        toast({
          title: "Error",
          description: "Failed to load mood entries",
          variant: "destructive"
        });
      } else if (data) {
        const entries: MoodEntry[] = data.map(entry => ({
          id: entry.id,
          mood: entry.mood,
          emoji: moodOptions.find(m => m.value === entry.mood)?.emoji || "😐",
          date: new Date(entry.created_at),
          note: entry.notes || undefined,
          energy: entry.energy_level,
          sleep: entry.sleep_quality,
          stress: entry.stress_level
        }));
        setMoodHistory(entries);
      }
      setLoading(false);
    };

    fetchMoodEntries();
  }, [navigate, toast]);

  // Generate chart data for the last 7 days
  const chartData = useMemo(() => {
    const data: HealthMetrics[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - (i * 86400000));
      const dayEntry = moodHistory.find(entry => 
        entry.date.toDateString() === date.toDateString()
      );
      
      const moodScore = dayEntry ? moodOptions.find(m => m.value === dayEntry.mood)?.score || 3 : 3;
      
      data.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        mood: moodScore,
        energy: dayEntry?.energy || Math.floor(Math.random() * 2) + 3,
        sleep: dayEntry?.sleep || Math.floor(Math.random() * 2) + 3,
        stress: dayEntry?.stress || Math.floor(Math.random() * 2) + 2,
        hydration: Math.floor(Math.random() * 20) + 75,
      });
    }
    return data;
  }, [moodHistory]);

  // Calculate weekly averages
  const weeklyAverages = useMemo(() => {
    const totalEntries = chartData.length;
    return {
      mood: Math.round((chartData.reduce((sum, day) => sum + day.mood, 0) / totalEntries) * 20), // Convert to percentage
      energy: Math.round((chartData.reduce((sum, day) => sum + day.energy, 0) / totalEntries) * 20),
      sleep: Math.round((chartData.reduce((sum, day) => sum + day.sleep, 0) / totalEntries) * 20),
      stress: Math.round((chartData.reduce((sum, day) => sum + day.stress, 0) / totalEntries) * 20),
    };
  }, [chartData]);

  const saveMood = async () => {
    if (!selectedMood) {
      toast({
        title: "Please select a mood",
        description: "Choose how you're feeling before saving",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please sign in to save your mood",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    const moodOption = moodOptions.find(m => m.value === selectedMood);
    if (!moodOption) return;

    const { data, error } = await supabase
      .from('mood_entries')
      .insert({
        user_id: user.id,
        mood: selectedMood,
        energy_level: energyLevel,
        sleep_quality: sleepQuality,
        stress_level: stressLevel,
        hydration: hydrationLevel
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving mood:', error);
      toast({
        title: "Error",
        description: "Failed to save mood entry",
        variant: "destructive",
      });
      return;
    }

    const newEntry: MoodEntry = {
      id: data.id,
      mood: selectedMood,
      emoji: moodOption.emoji,
      date: new Date(data.created_at),
      energy: energyLevel,
      sleep: sleepQuality,
      stress: stressLevel,
    };

    setMoodHistory(prev => [newEntry, ...prev]);
    setSelectedMood("");
    setEnergyLevel(3);
    setSleepQuality(3);
    setStressLevel(3);
    
    toast({
      title: "Daily check-in complete!",
      description: `Thanks for tracking your wellness. Keep taking care of yourself! ${moodOption.emoji}`,
    });
  };

  const getMoodStreak = () => {
    // Simple streak calculation - count consecutive days with mood entries
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today.getTime() - (i * 86400000));
      const hasEntry = moodHistory.some(entry => 
        entry.date.toDateString() === checkDate.toDateString()
      );
      
      if (hasEntry) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  return (
    <div className="min-h-screen bg-gradient-calm">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                <Heart className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold">Mood Tracker</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Weekly Activity Dashboard */}
        <div className="grid lg:grid-cols-4 gap-4 mb-6">
          {/* Hydration Progress */}
          <Card className="p-4 shadow-soft border-0 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-primary" />
                <span className="font-medium">Hydration</span>
              </div>
              <span className="text-2xl font-bold">{hydrationLevel}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-gradient-primary h-2 rounded-full transition-all duration-500" 
                style={{ width: `${hydrationLevel}%` }}
              />
            </div>
          </Card>

          {/* Mood Tracker */}
          <Card className="p-4 shadow-soft border-0 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-accent" />
                <span className="font-medium">Mood</span>
              </div>
              <span className="text-2xl font-bold">{weeklyAverages.mood}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-gradient-warm h-2 rounded-full transition-all duration-500" 
                style={{ width: `${weeklyAverages.mood}%` }}
              />
            </div>
          </Card>

          {/* Sleep Quality */}
          <Card className="p-4 shadow-soft border-0 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Moon className="w-5 h-5 text-success" />
                <span className="font-medium">Sleep Quality</span>
              </div>
              <span className="text-2xl font-bold">{weeklyAverages.sleep}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-success h-2 rounded-full transition-all duration-500" 
                style={{ width: `${weeklyAverages.sleep}%` }}
              />
            </div>
          </Card>

          {/* Energy Level */}
          <Card className="p-4 shadow-soft border-0 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-warning" />
                <span className="font-medium">Energy</span>
              </div>
              <span className="text-2xl font-bold">{weeklyAverages.energy}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-warning h-2 rounded-full transition-all duration-500" 
                style={{ width: `${weeklyAverages.energy}%` }}
              />
            </div>
          </Card>
        </div>

        {/* Health Trends Chart */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2 p-6 shadow-soft border-0 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-semibold">Health Trends (7 Days)</h3>
            </div>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[1, 5]} stroke="hsl(var(--muted-foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="mood" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="energy" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--success))", strokeWidth: 2, r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sleep" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--accent))", strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </Card>

          {/* Today's Check-in */}
          <Card className="p-6 shadow-soft border-0 bg-card/80 backdrop-blur-sm">
            <h3 className="text-xl font-semibold mb-4">Daily Check-in</h3>
            
            {/* Mood Selection */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">How's your mood?</label>
              <div className="grid grid-cols-5 gap-1">
                {moodOptions.map((mood) => (
                  <button
                    key={mood.value}
                    onClick={() => setSelectedMood(mood.value)}
                    className={`flex flex-col items-center p-2 rounded-lg border transition-all duration-300 ${
                      selectedMood === mood.value
                        ? 'border-primary bg-primary-light shadow-glow'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="text-lg">{mood.emoji}</span>
                    <span className="text-xs">{mood.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Energy Level */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Energy Level ({energyLevel}/5)</label>
              <input
                type="range"
                min="1"
                max="5"
                value={energyLevel}
                onChange={(e) => setEnergyLevel(Number(e.target.value))}
                className="w-full accent-success"
              />
            </div>

            {/* Sleep Quality */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Sleep Quality ({sleepQuality}/5)</label>
              <input
                type="range"
                min="1"
                max="5"
                value={sleepQuality}
                onChange={(e) => setSleepQuality(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </div>

            {/* Stress Level */}
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block">Stress Level ({stressLevel}/5)</label>
              <input
                type="range"
                min="1"
                max="5"
                value={stressLevel}
                onChange={(e) => setStressLevel(Number(e.target.value))}
                className="w-full accent-warning"
              />
            </div>

            <Button 
              onClick={saveMood}
              disabled={!selectedMood}
              className="bg-gradient-primary hover:shadow-glow transition-all duration-300 w-full"
            >
              Complete Check-in
            </Button>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 shadow-soft border-0 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success-light rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Check-in Streak</p>
                <p className="text-2xl font-bold">{getMoodStreak()} days</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 shadow-soft border-0 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-2xl font-bold">{moodHistory.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 shadow-soft border-0 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-light rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">
                  {moodHistory.filter(entry => 
                    entry.date > new Date(Date.now() - 7 * 86400000)
                  ).length} entries
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Mood History */}
        <Card className="p-6 shadow-soft border-0 bg-card/80 backdrop-blur-sm">
          <h3 className="text-xl font-semibold mb-4">Your Recent Check-ins</h3>
          
          {moodHistory.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No mood entries yet. Start by checking in above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {moodHistory.slice(0, 10).map((entry) => {
                const moodOption = moodOptions.find(m => m.value === entry.mood);
                return (
                  <div key={entry.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                    <span className="text-2xl">{entry.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{entry.mood}</span>
                        <span className={`w-2 h-2 rounded-full ${moodOption?.color || 'bg-muted'}`}></span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {entry.date.toLocaleDateString()} at {entry.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {entry.note && (
                        <p className="text-sm text-foreground mt-1 italic">"{entry.note}"</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Encouragement */}
        <Card className="p-6 mt-6 bg-gradient-warm border-0 shadow-warm text-center">
          <h3 className="text-xl font-semibold mb-2">Remember</h3>
          <p className="text-muted-foreground">
            Every feeling is valid. Tracking your mood helps you understand patterns and celebrate progress. 
            You're doing great by taking care of your mental health! 💙
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Mood;