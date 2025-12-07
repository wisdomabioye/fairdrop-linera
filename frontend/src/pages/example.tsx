import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Field, FieldGroup } from "@/components/ui/field"
import { Item } from "@/components/ui/item"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts"

const chartData = [
  { month: "Jan", arctic: 186, coral: 80 },
  { month: "Feb", arctic: 305, coral: 200 },
  { month: "Mar", arctic: 237, coral: 120 },
  { month: "Apr", arctic: 273, coral: 190 },
  { month: "May", arctic: 209, coral: 130 },
  { month: "Jun", arctic: 214, coral: 140 },
]

const chartConfig = {
  arctic: {
    label: "Active Bids",
    color: "#0EA5E9",
  },
  coral: {
    label: "Settled Auctions",
    color: "#F43F5E",
  },
} satisfies ChartConfig

export default function ExamplePage() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [theme, setTheme] = useState<"light" | "dark">("light")

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    document.documentElement.classList.toggle("dark")
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Toaster />

      {/* Header with gradient */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#2D9CDB] to-[#56CCF2] shadow-lg">
              <svg className="size-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Fairdrop UI Showcase</h1>
          </div>
          <Button onClick={toggleTheme} variant="outline" size="icon">
            {theme === "light" ? "🌙" : "☀️"}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-8 py-12">
        {/* Hero Section */}
        <section className="mb-20 text-center animate-fade-in">
          <div className="mb-8 inline-block">
            <Badge variant="info" className="mb-4 animate-slide-up">
              Enhanced Design System
            </Badge>
          </div>
          <h2 className="mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <span className="text-gradient-primary">Fairdrop Auction Platform</span>
          </h2>
          <p className="mx-auto max-w-3xl text-xl leading-relaxed text-muted-foreground animate-slide-up" style={{ animationDelay: "0.2s" }}>
            Industry-standard UI/UX with vibrant colors, smooth animations, and delightful micro-interactions.
            Built for blockchain auctions on Linera.
          </p>
          <div className="mt-8 flex justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Button variant="gradient" size="lg" className="shadow-glow-primary">
              Explore Auctions
            </Button>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
        </section>

        {/* Buttons Section */}
        <section className="mb-16">
          <Card className="p-8 hover-lift animate-fade-in">
            <h3 className="mb-6">Button Variants</h3>
            <div className="space-y-6">
              <div>
                <h4 className="mb-3 text-sm font-medium text-muted-foreground">Primary Actions</h4>
                <div className="flex flex-wrap gap-3">
                  <Button>Primary</Button>
                  <Button variant="gradient">Gradient</Button>
                  <Button variant="success">Success</Button>
                  <Button variant="warning">Warning</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-medium text-muted-foreground">Secondary Actions</h4>
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                </div>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-medium text-muted-foreground">Sizes</h4>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="xl">Extra Large</Button>
                </div>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-medium text-muted-foreground">States</h4>
                <div className="flex flex-wrap gap-3">
                  <Button disabled>Disabled</Button>
                  <Button variant="outline" disabled>Disabled Outline</Button>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Badges Section */}
        <section className="mb-16">
          <Card className="p-8 hover-lift animate-fade-in">
            <h3 className="mb-6">Badge Variants</h3>
            <div className="space-y-6">
              <div>
                <h4 className="mb-3 text-sm font-medium text-muted-foreground">Standard Badges</h4>
                <div className="flex flex-wrap gap-3">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                </div>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-medium text-muted-foreground">Status Badges</h4>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="info">Info</Badge>
                </div>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-medium text-muted-foreground">Auction Status Badges</h4>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="active">Active Auction</Badge>
                  <Badge variant="ending">Ending Soon</Badge>
                  <Badge variant="winning">You're Winning!</Badge>
                  <Badge variant="outbid">Outbid</Badge>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Auction Card Preview */}
        <section className="mb-16">
          <h3 className="mb-6">Auction Card Preview</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="hover-lift animate-slide-in-left overflow-hidden">
              <div className="aspect-video bg-gradient-primary flex items-center justify-center">
                <div className="text-6xl">🎨</div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-lg mb-1">Digital Art NFT #1234</h4>
                    <p className="text-sm text-muted-foreground">by CryptoArtist</p>
                  </div>
                  <Badge variant="active">Active</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Current Price</span>
                    <div className="text-2xl font-bold text-gradient-primary">$2,450</div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sold</span>
                    <span className="font-medium">124 / 500</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full gradient-primary w-1/4"></div>
                  </div>
                </div>
                <Button variant="gradient" className="w-full">Place Bid</Button>
              </div>
            </Card>

            <Card className="hover-lift animate-slide-up overflow-hidden">
              <div className="aspect-video bg-gradient-warning flex items-center justify-center">
                <div className="text-6xl">⚡</div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-lg mb-1">Lightning NFT Pack</h4>
                    <p className="text-sm text-muted-foreground">by ThunderStudio</p>
                  </div>
                  <Badge variant="ending">5m left</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Current Price</span>
                    <div className="text-2xl font-bold text-gradient-accent">$890</div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sold</span>
                    <span className="font-medium">456 / 500</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full gradient-warning w-11/12 animate-pulse-subtle"></div>
                  </div>
                </div>
                <Button variant="warning" className="w-full">Quick Bid</Button>
              </div>
            </Card>

            <Card className="hover-lift animate-slide-in-right overflow-hidden">
              <div className="aspect-video bg-gradient-success flex items-center justify-center">
                <div className="text-6xl">🏆</div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-lg mb-1">Premium Badge #999</h4>
                    <p className="text-sm text-muted-foreground">by MetaLabs</p>
                  </div>
                  <Badge variant="winning">Winning!</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Your Bid</span>
                    <div className="text-2xl font-bold text-success">$5,200</div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Position</span>
                    <span className="font-medium text-success">1st / 89 bids</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full gradient-success w-full"></div>
                  </div>
                </div>
                <Button variant="success" className="w-full">Increase Bid</Button>
              </div>
            </Card>
          </div>
        </section>

        {/* Forms Section */}
        <section className="mb-16">
          <Card className="p-8 hover-lift animate-fade-in">
            <h3 className="mb-6">Form Components</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <FieldGroup>
                <Field>
                  <Label>Email</Label>
                  <Input type="email" placeholder="you@example.com" className="transition-all duration-200 focus:ring-2" />
                </Field>
                <Field>
                  <Label>Password</Label>
                  <Input type="password" placeholder="••••••••" className="transition-all duration-200 focus:ring-2" />
                </Field>
              </FieldGroup>

              <FieldGroup>
                <Field>
                  <Label>Select Option</Label>
                  <Select>
                    <SelectTrigger className="transition-all duration-200 focus:ring-2">
                      <SelectValue placeholder="Choose an option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arctic">Arctic Blue</SelectItem>
                      <SelectItem value="coral">Coral Red</SelectItem>
                      <SelectItem value="gradient">Gradient Mix</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div>
                  <Button onClick={() => toast.success("Form submitted successfully!", { description: "Your changes have been saved." })} className="w-full transition-transform duration-200 hover:scale-105">
                    Submit
                  </Button>
                </div>
              </FieldGroup>
            </div>
          </Card>
        </section>

        {/* Tabs Section */}
        <section className="mb-16">
          <Card className="p-8 shadow-lg transition-all duration-300 hover:shadow-xl animate-fade-in">
            <h3 className="mb-6 text-2xl font-semibold text-foreground">Tabs</h3>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview" className="transition-all duration-200">Overview</TabsTrigger>
                <TabsTrigger value="analytics" className="transition-all duration-200">Analytics</TabsTrigger>
                <TabsTrigger value="settings" className="transition-all duration-200">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-6 space-y-4 animate-fade-in">
                <h4 className="text-lg font-medium">Overview</h4>
                <p className="text-muted-foreground">
                  This is the overview tab showcasing the Arctic Blue theme with smooth transitions.
                </p>
              </TabsContent>
              <TabsContent value="analytics" className="mt-6 space-y-4 animate-fade-in">
                <h4 className="text-lg font-medium">Analytics</h4>
                <p className="text-muted-foreground">
                  View your analytics and metrics with beautiful Coral Red accents.
                </p>
              </TabsContent>
              <TabsContent value="settings" className="mt-6 space-y-4 animate-fade-in">
                <h4 className="text-lg font-medium">Settings</h4>
                <p className="text-muted-foreground">
                  Configure your preferences with our elegant design system.
                </p>
              </TabsContent>
            </Tabs>
          </Card>
        </section>

        {/* Dialog & Drawer Section */}
        <section className="mb-16">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-8 shadow-lg transition-all duration-300 hover:shadow-xl animate-fade-in">
              <h3 className="mb-6 text-2xl font-semibold text-foreground">Dialog</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="transition-transform duration-200 hover:scale-105">Open Dialog</Button>
                </DialogTrigger>
                <DialogContent className="animate-fade-in">
                  <DialogHeader>
                    <DialogTitle>Arctic Blue Dialog</DialogTitle>
                    <DialogDescription>
                      This is a beautiful dialog with smooth animations and the Arctic Blue theme.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Field>
                      <Label>Name</Label>
                      <Input placeholder="Enter your name" />
                    </Field>
                    <Field>
                      <Label>Email</Label>
                      <Input type="email" placeholder="you@example.com" />
                    </Field>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline">Cancel</Button>
                    <Button onClick={() => toast.success("Saved!")}>Save Changes</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </Card>

            <Card className="p-8 shadow-lg transition-all duration-300 hover:shadow-xl animate-fade-in">
              <h3 className="mb-6 text-2xl font-semibold text-foreground">Drawer</h3>
              <Drawer>
                <DrawerTrigger asChild>
                  <Button className="bg-[#EB5757] hover:bg-[#EB5757]/90 transition-transform duration-200 hover:scale-105">
                    Open Drawer
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader className="text-left">
                    <DrawerTitle>Coral Red Drawer</DrawerTitle>
                    <DrawerDescription>
                      Slide-in drawer with elegant animations and coral accent.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="p-4 space-y-4">
                    <Item>
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-[#2D9CDB]/10 text-[#2D9CDB]">
                          1
                        </div>
                        <div>
                          <p className="font-medium">First Step</p>
                          <p className="text-sm text-muted-foreground">Complete your profile</p>
                        </div>
                      </div>
                    </Item>
                    <Item>
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-[#EB5757]/10 text-[#EB5757]">
                          2
                        </div>
                        <div>
                          <p className="font-medium">Second Step</p>
                          <p className="text-sm text-muted-foreground">Verify your email</p>
                        </div>
                      </div>
                    </Item>
                  </div>
                  <DrawerFooter>
                    <Button>Continue</Button>
                    <DrawerClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </Card>
          </div>
        </section>

        {/* Calendar & Chart Section */}
        <section className="mb-16">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-8 shadow-lg transition-all duration-300 hover:shadow-xl animate-fade-in">
              <h3 className="mb-6 text-2xl font-semibold text-foreground">Calendar</h3>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border"
                />
              </div>
            </Card>

            <Card className="p-8 shadow-lg transition-all duration-300 hover:shadow-xl animate-fade-in">
              <h3 className="mb-6 text-2xl font-semibold text-foreground">Chart</h3>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="arctic" fill="#0EA5E9" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="coral" fill="#F43F5E" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </Card>
          </div>
        </section>

        {/* Items List Section */}
        <section className="mb-16">
          <Card className="p-8 shadow-lg transition-all duration-300 hover:shadow-xl animate-fade-in">
            <h3 className="mb-6 text-2xl font-semibold text-foreground">Items List</h3>
            <div className="space-y-2">
              <Item className="transition-all duration-200 hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#2D9CDB] to-[#56CCF2] text-white">
                      A
                    </div>
                    <div>
                      <p className="font-medium">Arctic Blue Item</p>
                      <p className="text-sm text-muted-foreground">Primary color theme</p>
                    </div>
                  </div>
                  <Badge className="bg-[#2D9CDB] text-white">Active</Badge>
                </div>
              </Item>
              <Item className="transition-all duration-200 hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-[#EB5757] text-white">
                      C
                    </div>
                    <div>
                      <p className="font-medium">Coral Red Item</p>
                      <p className="text-sm text-muted-foreground">Accent color theme</p>
                    </div>
                  </div>
                  <Badge className="bg-[#EB5757] text-white">Featured</Badge>
                </div>
              </Item>
              <Item className="transition-all duration-200 hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      N
                    </div>
                    <div>
                      <p className="font-medium">Neutral Item</p>
                      <p className="text-sm text-muted-foreground">Secondary theme</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Default</Badge>
                </div>
              </Item>
            </div>
          </Card>
        </section>

        {/* Toast Demo Section */}
        <section className="mb-16">
          <Card className="p-8 shadow-lg transition-all duration-300 hover:shadow-xl animate-fade-in">
            <h3 className="mb-6 text-2xl font-semibold text-foreground">Toast Notifications</h3>
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => toast.success("Success!", { description: "Operation completed successfully." })}>
                Success Toast
              </Button>
              <Button
                onClick={() => toast.error("Error!", { description: "Something went wrong." })}
                className="bg-[#EB5757] hover:bg-[#EB5757]/90"
              >
                Error Toast
              </Button>
              <Button
                onClick={() => toast.info("Info", { description: "Here's some information for you." })}
                variant="outline"
              >
                Info Toast
              </Button>
              <Button
                onClick={() => toast("Custom Toast", {
                  description: "With Arctic Blue theme",
                  className: "bg-[#2D9CDB] text-white"
                })}
                variant="secondary"
              >
                Custom Toast
              </Button>
            </div>
          </Card>
        </section>

        {/* Gradient Cards Section */}
        <section className="mb-16">
          <h3 className="mb-6 text-2xl font-semibold text-foreground">Gradient Cards</h3>
          <div className="grid gap-6 md:grid-cols-3 mb-6">
            <Card className="gradient-primary-br p-8 text-white shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105 animate-fade-in">
              <div className="mb-4">
                <svg className="size-12 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="mb-2 text-xl font-bold">Primary Gradient</h4>
              <p className="text-white/90">Beautiful gradient from deep blue to sky blue, perfect for primary actions and highlights.</p>
            </Card>

            <Card className="gradient-primary-accent p-8 text-white shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105 animate-fade-in">
              <div className="mb-4">
                <svg className="size-12 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <h4 className="mb-2 text-xl font-bold">Primary + Accent</h4>
              <p className="text-white/90">Dynamic blend from sky blue to rose, creating a vibrant and energetic visual.</p>
            </Card>

            <Card className="gradient-multi p-8 text-white shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105 animate-fade-in">
              <div className="mb-4">
                <svg className="size-12 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h4 className="mb-2 text-xl font-bold">Full Spectrum</h4>
              <p className="text-white/90">Complete theme gradient spanning from blue through purple to rose.</p>
            </Card>
          </div>

          <h4 className="mb-4 text-lg font-medium text-muted-foreground">Accent + Gray Gradients</h4>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="gradient-accent-gray p-8 text-white shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105 animate-fade-in">
              <div className="mb-4">
                <svg className="size-12 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h4 className="mb-2 text-xl font-bold">Accent + Gray</h4>
              <p className="text-white/90">Refined blend of deep red with slate gray tones for a sophisticated look.</p>
            </Card>

            <Card className="gradient-accent-dark p-8 text-white shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105 animate-fade-in">
              <div className="mb-4">
                <svg className="size-12 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="mb-2 text-xl font-bold">Accent + Dark</h4>
              <p className="text-white/90">Rich gradient from rose to deep dark tones for premium, dramatic effect.</p>
            </Card>

            <Card className="gradient-accent-muted p-8 text-white shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105 animate-fade-in">
              <div className="mb-4">
                <svg className="size-12 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
              </div>
              <h4 className="mb-2 text-xl font-bold">Accent + Muted</h4>
              <p className="text-white/90">Gentle transition from deep red to muted gray for elegant, understated designs.</p>
            </Card>
          </div>
        </section>

        {/* Gradient Backgrounds Section */}
        <section className="mb-16">
          <h3 className="mb-6 text-2xl font-semibold text-foreground">Gradient Backgrounds</h3>
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-xl gradient-primary-r p-12 shadow-2xl transition-all duration-300 hover:shadow-3xl animate-fade-in">
              <div className="relative z-10">
                <h4 className="mb-3 text-3xl font-bold text-white">Horizontal Primary Flow</h4>
                <p className="mb-6 max-w-2xl text-lg text-white/90">
                  A smooth left-to-right gradient perfect for hero sections and feature highlights.
                </p>
                <Button className="bg-white text-primary hover:bg-white/90 transition-transform duration-200 hover:scale-105">
                  Get Started
                </Button>
              </div>
              <div className="absolute right-0 top-0 size-64 translate-x-32 -translate-y-32 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute bottom-0 left-0 size-64 -translate-x-32 translate-y-32 rounded-full bg-white/10 blur-3xl" />
            </div>

            <div className="relative overflow-hidden rounded-xl gradient-multi p-12 shadow-2xl transition-all duration-300 hover:shadow-3xl animate-fade-in">
              <div className="relative z-10">
                <h4 className="mb-3 text-3xl font-bold text-white">Diagonal Multi-tone</h4>
                <p className="mb-6 max-w-2xl text-lg text-white/90">
                  A vibrant diagonal gradient combining all theme colors for maximum visual impact.
                </p>
                <Button className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 transition-transform duration-200 hover:scale-105">
                  Learn More
                </Button>
              </div>
              <div className="absolute right-0 top-0 size-96 translate-x-48 -translate-y-48 rounded-full bg-white/5 blur-3xl" />
            </div>

            <div className="grid gap-6 md:grid-cols-2 mb-6">
              <div className="relative overflow-hidden rounded-xl gradient-primary-accent p-8 shadow-xl transition-all duration-300 hover:shadow-2xl animate-fade-in">
                <div className="relative z-10">
                  <Badge className="mb-4 bg-white/20 text-white border-white/30">Featured</Badge>
                  <h4 className="mb-2 text-2xl font-bold text-white">Primary to Accent</h4>
                  <p className="text-white/90">Diagonal gradient from Arctic Blue to Coral Red creating depth and dimension.</p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl gradient-primary-br p-8 shadow-xl transition-all duration-300 hover:shadow-2xl animate-fade-in">
                <div className="relative z-10">
                  <Badge className="mb-4 bg-white/20 text-white border-white/30">Popular</Badge>
                  <h4 className="mb-2 text-2xl font-bold text-white">Primary Fade</h4>
                  <p className="text-white/90">Bottom-right gradient with subtle blue transition.</p>
                </div>
              </div>
            </div>

            <h4 className="mb-4 text-lg font-medium text-muted-foreground">Accent + Gray Backgrounds</h4>
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-xl gradient-accent-gray p-12 shadow-2xl transition-all duration-300 hover:shadow-3xl animate-fade-in">
                <div className="relative z-10">
                  <h4 className="mb-3 text-3xl font-bold text-white">Accent Flow</h4>
                  <p className="mb-6 max-w-2xl text-lg text-white/90">
                    A refined gradient from deep red to slate that brings warmth and sophistication to your design.
                  </p>
                  <Button className="bg-white text-destructive hover:bg-white/90 transition-transform duration-200 hover:scale-105">
                    Get Started
                  </Button>
                </div>
                <div className="absolute right-0 top-0 size-64 translate-x-32 -translate-y-32 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute bottom-0 left-0 size-64 -translate-x-32 translate-y-32 rounded-full bg-white/10 blur-3xl" />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="relative overflow-hidden rounded-xl gradient-accent-dark p-8 shadow-xl transition-all duration-300 hover:shadow-2xl animate-fade-in">
                  <div className="relative z-10">
                    <Badge className="mb-4 bg-white/10 text-white border-white/20">Premium</Badge>
                    <h4 className="mb-2 text-2xl font-bold text-white">Accent + Dark</h4>
                    <p className="text-white/90">Dramatic blend from Coral Red to deep dark tones for bold impact.</p>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-xl gradient-accent-subtle p-8 shadow-xl transition-all duration-300 hover:shadow-2xl animate-fade-in">
                  <div className="relative z-10">
                    <Badge className="mb-4 bg-white/20 text-white border-white/30">Elegant</Badge>
                    <h4 className="mb-2 text-2xl font-bold text-white">Accent Subtle</h4>
                    <p className="text-white/90">Gentle gradient with extended Coral Red transitioning to gray.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Color Palette Section */}
        <section className="mb-16">
          <Card className="p-8 shadow-lg transition-all duration-300 hover:shadow-xl animate-fade-in">
            <h3 className="mb-6 text-2xl font-semibold text-foreground">Color Palette & Gradients</h3>

            <h4 className="mb-4 text-sm font-medium text-muted-foreground">Primary Colors</h4>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-[#2D9CDB] shadow-lg transition-transform duration-300 hover:scale-105" />
                <p className="text-sm font-medium">Arctic Blue</p>
                <p className="text-xs text-muted-foreground">#2D9CDB</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-[#56CCF2] shadow-lg transition-transform duration-300 hover:scale-105" />
                <p className="text-sm font-medium">Light Arctic</p>
                <p className="text-xs text-muted-foreground">#56CCF2</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-[#EB5757] shadow-lg transition-transform duration-300 hover:scale-105" />
                <p className="text-sm font-medium">Coral Red</p>
                <p className="text-xs text-muted-foreground">#EB5757</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg bg-[#1A2C3D] shadow-lg transition-transform duration-300 hover:scale-105" />
                <p className="text-sm font-medium">Dark Text</p>
                <p className="text-xs text-muted-foreground">#1A2C3D</p>
              </div>
            </div>

            <h4 className="mb-4 text-sm font-medium text-muted-foreground">Gradient Utilities</h4>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <div className="h-24 rounded-lg gradient-arctic shadow-lg transition-transform duration-300 hover:scale-105" />
                <p className="text-sm font-medium">gradient-arctic</p>
                <p className="text-xs text-muted-foreground">Arctic Blue → Light Arctic</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg gradient-primary-accent shadow-lg transition-transform duration-300 hover:scale-105" />
                <p className="text-sm font-medium">gradient-primary-accent</p>
                <p className="text-xs text-muted-foreground">Arctic Blue → Coral Red</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg gradient-accent-gray shadow-lg transition-transform duration-300 hover:scale-105" />
                <p className="text-sm font-medium">gradient-accent-gray</p>
                <p className="text-xs text-muted-foreground">Coral Red → Gray</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg gradient-accent-dark shadow-lg transition-transform duration-300 hover:scale-105" />
                <p className="text-sm font-medium">gradient-accent-dark</p>
                <p className="text-xs text-muted-foreground">Coral Red → Dark</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg gradient-accent-muted shadow-lg transition-transform duration-300 hover:scale-105" />
                <p className="text-sm font-medium">gradient-accent-muted</p>
                <p className="text-xs text-muted-foreground">Coral Red → Muted Gray</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 rounded-lg gradient-multi shadow-lg transition-transform duration-300 hover:scale-105" />
                <p className="text-sm font-medium">gradient-multi</p>
                <p className="text-xs text-muted-foreground">Light Arctic → Arctic → Coral</p>
              </div>
            </div>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card py-12">
        <div className="container mx-auto px-8">
          <div className="grid gap-8 md:grid-cols-3 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-10 items-center justify-center rounded-lg gradient-primary shadow-lg">
                  <svg className="size-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h5 className="font-semibold">Fairdrop</h5>
              </div>
              <p className="text-sm text-muted-foreground">
                Modern auction platform built on Linera blockchain with industry-standard UI/UX.
              </p>
            </div>
            <div>
              <h6 className="font-semibold mb-3">Features</h6>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Vibrant color system</li>
                <li>• Smooth animations</li>
                <li>• Responsive design</li>
                <li>• Auction-specific components</li>
              </ul>
            </div>
            <div>
              <h6 className="font-semibold mb-3">Design System</h6>
              <div className="flex gap-2">
                <Badge variant="info">Modern</Badge>
                <Badge variant="success">Accessible</Badge>
                <Badge variant="outline">Fast</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Enhanced with gradient utilities, micro-interactions, and delightful UX
              </p>
            </div>
          </div>
          <div className="border-t border-border/50 pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Fairdrop UI Showcase • Built with React, Tailwind CSS, and Radix UI
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
