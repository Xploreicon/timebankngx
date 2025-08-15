import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

const timeData = [
  { month: 'Jan', credits: 45, spent: 30 },
  { month: 'Feb', credits: 52, spent: 35 },
  { month: 'Mar', credits: 48, spent: 40 },
  { month: 'Apr', credits: 61, spent: 45 },
  { month: 'May', credits: 55, spent: 38 },
  { month: 'Jun', credits: 67, spent: 52 }
]

const categoryData = [
  { category: 'Tech', hours: 45 },
  { category: 'Creative', hours: 32 },
  { category: 'Legal', hours: 28 },
  { category: 'Food', hours: 21 },
  { category: 'Fashion', hours: 15 }
]

const serviceData = [
  { name: 'Web Development', value: 35, color: 'hsl(var(--primary))' },
  { name: 'Design', value: 25, color: 'hsl(var(--secondary))' },
  { name: 'Writing', value: 20, color: 'hsl(var(--accent))' },
  { name: 'Consulting', value: 20, color: 'hsl(var(--muted))' }
]

export const TimeFlowChart = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Time Flow Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
          </TabsList>
          
          <TabsContent value="timeline" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="credits" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Credits Earned"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="spent" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={2}
                    name="Credits Spent"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Bar 
                    dataKey="hours" 
                    fill="hsl(var(--primary))"
                    name="Hours Traded"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="services" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {serviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}