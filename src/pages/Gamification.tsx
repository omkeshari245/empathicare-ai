import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Gamepad2, Target, Puzzle, Waves, Brain, Music, CheckCircle, Star, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Gamification = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [breathingCount, setBreathingCount] = useState(0);
  const [sequenceGame, setSequenceGame] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [puzzleScore, setPuzzleScore] = useState(0);
  const [gameStats, setGameStats] = useState({
    gamesPlayed: 0,
    stressReduced: 0,
    streak: 0,
    totalMinutes: 0
  });

  const games = [
    {
      id: "breathing-garden",
      title: "Breathing Garden",
      description: "Watch flowers bloom as you practice deep breathing exercises",
      icon: Waves,
      color: "text-primary",
      bgColor: "bg-primary-light",
      difficulty: "Easy",
      duration: "5-10 min"
    },
    {
      id: "memory-calm",
      title: "Memory Calm",
      description: "Improve focus and reduce anxiety with calming memory games",
      icon: Brain,
      color: "text-success",
      bgColor: "bg-success-light",
      difficulty: "Medium",
      duration: "10-15 min"
    },
    {
      id: "mindful-music",
      title: "Mindful Music Maker",
      description: "Create soothing melodies to express emotions and find peace",
      icon: Music,
      color: "text-accent",
      bgColor: "bg-accent-light",
      difficulty: "Easy",
      duration: "15-20 min"
    },
    {
      id: "puzzle-zen",
      title: "Puzzle Zen",
      description: "Solve relaxing puzzles that help calm racing thoughts",
      icon: Puzzle,
      color: "text-warning",
      bgColor: "bg-warning/20",
      difficulty: "Medium",
      duration: "20-30 min"
    }
  ];

  const achievements = [
    {
      title: "First Breath",
      description: "Complete your first breathing exercise",
      earned: true,
      icon: CheckCircle,
      color: "text-success"
    },
    {
      title: "Memory Master",
      description: "Score 100% on a memory game",
      earned: true,
      icon: Brain,
      color: "text-primary"
    },
    {
      title: "Daily Warrior",
      description: "Play stress-relief games for 7 days straight",
      earned: false,
      icon: Target,
      color: "text-muted-foreground"
    },
    {
      title: "Zen Master",
      description: "Complete all 4 stress-relief games",
      earned: false,
      icon: Star,
      color: "text-muted-foreground"
    }
  ];

  useEffect(() => {
    const fetchGameStats = async () => {
      if (user) {
        const { data } = await supabase
          .from('game_scores')
          .select('*')
          .eq('user_id', user.id);
        
        if (data) {
          const gamesPlayed = data.length;
          const totalMinutes = data.reduce((acc, game) => acc + (game.duration_minutes || 0), 0);
          const completedGames = data.filter(g => g.completed).length;
          const stressReduced = gamesPlayed > 0 ? Math.round((completedGames / gamesPlayed) * 100) : 0;
          
          setGameStats({
            gamesPlayed,
            stressReduced,
            streak: 5, // You could calculate actual streak based on dates
            totalMinutes
          });
        }
      }
    };

    fetchGameStats();
  }, [user]);

  const saveGameScore = async (gameId: string, score: number, completed: boolean, duration: number) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save your progress",
        variant: "destructive"
      });
      return;
    }

    await supabase.from('game_scores').insert({
      user_id: user.id,
      game_id: gameId,
      score,
      completed,
      duration_minutes: duration
    });

    // Refresh stats
    const { data } = await supabase
      .from('game_scores')
      .select('*')
      .eq('user_id', user.id);
    
    if (data) {
      const gamesPlayed = data.length;
      const totalMinutes = data.reduce((acc, game) => acc + (game.duration_minutes || 0), 0);
      const completedGames = data.filter(g => g.completed).length;
      const stressReduced = gamesPlayed > 0 ? Math.round((completedGames / gamesPlayed) * 100) : 0;
      
      setGameStats({
        gamesPlayed,
        stressReduced,
        streak: 5,
        totalMinutes
      });
    }
  };

  const startBreathingGame = () => {
    setActiveGame("breathing-garden");
    setBreathingCount(0);
    const startTime = Date.now();
    
    const breathingCycle = setInterval(() => {
      setBreathingCount(prev => {
        if (prev >= 10) {
          clearInterval(breathingCycle);
          const duration = Math.round((Date.now() - startTime) / 60000);
          saveGameScore("breathing-garden", 10, true, duration);
          setActiveGame(null);
          return 0;
        }
        return prev + 1;
      });
    }, 4000); // 4 second breathing cycles
  };

  const startMemoryGame = () => {
    setActiveGame("memory-calm");
    const sequence = Array.from({length: 4}, () => Math.floor(Math.random() * 4));
    setSequenceGame(sequence);
    setUserSequence([]);
  };

  const handleMemoryInput = (number: number) => {
    const newUserSequence = [...userSequence, number];
    setUserSequence(newUserSequence);
    
    if (newUserSequence.length === sequenceGame.length) {
      const isCorrect = newUserSequence.every((num, idx) => num === sequenceGame[idx]);
      if (isCorrect) {
        setPuzzleScore(prev => prev + 10);
        saveGameScore("memory-calm", puzzleScore + 10, true, 2);
      }
      setTimeout(() => {
        setActiveGame(null);
        setUserSequence([]);
        setSequenceGame([]);
      }, 1000);
    }
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
                <Gamepad2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold">Stress-Relief Games</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Hero Section */}
        <Card className="p-8 text-center mb-8 shadow-soft border-0 bg-card/80 backdrop-blur-sm">
          <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Gamepad2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Interactive Stress-Relief Games</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Play engaging games designed to reduce stress, improve focus, and promote relaxation. 
            Each game uses evidence-based techniques to help calm your mind and body.
          </p>
        </Card>

        {/* Weekly Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 shadow-soft border-0 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Games Played</p>
                <p className="text-2xl font-bold">{gameStats.gamesPlayed}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 shadow-soft border-0 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success-light rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stress Reduced</p>
                <p className="text-2xl font-bold">{gameStats.stressReduced}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 shadow-soft border-0 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-warning/20 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Daily Streak</p>
                <p className="text-2xl font-bold">{gameStats.streak} days</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 shadow-soft border-0 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-light rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time Played</p>
                <p className="text-2xl font-bold">{gameStats.totalMinutes}m</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Games Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {games.map((game) => {
            const Icon = game.icon;
            const isActive = activeGame === game.id;
            
            return (
              <Card key={game.id} className={`p-6 shadow-soft border-0 transition-all duration-300 ${
                isActive ? 'bg-primary-light border-primary shadow-glow' : 'bg-card/80 backdrop-blur-sm hover:shadow-warm'
              }`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 ${game.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${game.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{game.title}</h3>
                    <p className="text-muted-foreground text-sm mb-3">{game.description}</p>
                    <div className="flex gap-2 text-xs">
                      <span className="bg-muted px-2 py-1 rounded">{game.difficulty}</span>
                      <span className="bg-muted px-2 py-1 rounded">{game.duration}</span>
                    </div>
                  </div>
                </div>

                {/* Game Content */}
                {isActive && game.id === "breathing-garden" && (
                  <div className="mb-4 p-4 bg-muted/30 rounded-lg text-center">
                    <div className="text-6xl mb-2">🌸</div>
                    <p className="text-lg font-semibold">Breathe {breathingCount}/10</p>
                    <p className="text-sm text-muted-foreground">
                      {breathingCount % 2 === 0 ? "Breathe in slowly..." : "Breathe out gently..."}
                    </p>
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div 
                        className="bg-gradient-primary h-2 rounded-full transition-all duration-1000" 
                        style={{ width: `${(breathingCount / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {isActive && game.id === "memory-calm" && (
                  <div className="mb-4 p-4 bg-muted/30 rounded-lg">
                    <p className="text-center mb-3">Remember the sequence:</p>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[0, 1, 2, 3].map((i) => (
                        <Button
                          key={i}
                          variant={sequenceGame.includes(i) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleMemoryInput(i)}
                          className="aspect-square"
                        >
                          {i + 1}
                        </Button>
                      ))}
                    </div>
                    <p className="text-center text-sm">Score: {puzzleScore}</p>
                  </div>
                )}

                <Button 
                  className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                  onClick={() => {
                    if (game.id === "breathing-garden") startBreathingGame();
                    if (game.id === "memory-calm") startMemoryGame();
                    if (game.id === "mindful-music" || game.id === "puzzle-zen") setActiveGame(game.id);
                  }}
                  disabled={isActive}
                >
                  {isActive ? `Playing ${game.title}...` : `Play ${game.title}`}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Achievements */}
        <Card className="p-6 shadow-soft border-0 bg-card/80 backdrop-blur-sm">
          <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-warning" />
            Achievements
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {achievements.map((achievement, index) => {
              const Icon = achievement.icon;
              return (
                <div key={index} className={`p-4 rounded-lg border transition-all duration-300 ${
                  achievement.earned 
                    ? 'bg-success-light border-success shadow-glow' 
                    : 'bg-muted/30 border-muted'
                }`}>
                  <div className="text-center">
                    <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
                      achievement.earned ? 'bg-success' : 'bg-muted'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        achievement.earned ? 'text-success-foreground' : achievement.color
                      }`} />
                    </div>
                    <h4 className="font-semibold mb-1">{achievement.title}</h4>
                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    {achievement.earned && (
                      <span className="text-xs text-success font-medium mt-2 block">Earned!</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* CTA */}
        <Card className="p-8 text-center mt-8 shadow-soft border-0 bg-gradient-warm">
          <h3 className="text-2xl font-bold mb-4">Make Wellness Fun</h3>
          <p className="text-muted-foreground mb-6">
            Turn stress relief into an enjoyable daily habit. Play for just 10 minutes a day to see real benefits.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/mood">
              <Button variant="outline">
                Track Progress
              </Button>
            </Link>
            <Button className="bg-gradient-primary hover:shadow-glow transition-all duration-300">
              <Star className="w-4 h-4 mr-2" />
              Set Daily Reminder
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Gamification;