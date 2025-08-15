import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import * as d3 from 'd3'
import { Network } from 'lucide-react'

interface Node extends d3.SimulationNodeDatum {
  id: string
  name: string
  category: string
  connections: number
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node
  target: string | Node
  trades: number
}

const mockNodes: Node[] = [
  { id: '1', name: 'You', category: 'Tech', connections: 8 },
  { id: '2', name: 'Sarah K.', category: 'Design', connections: 12 },
  { id: '3', name: 'John D.', category: 'Legal', connections: 6 },
  { id: '4', name: 'Mary L.', category: 'Food', connections: 9 },
  { id: '5', name: 'Ahmed B.', category: 'Tech', connections: 7 },
  { id: '6', name: 'Grace O.', category: 'Creative', connections: 10 }
]

const mockLinks: Link[] = [
  { source: '1', target: '2', trades: 3 },
  { source: '1', target: '3', trades: 1 },
  { source: '1', target: '5', trades: 2 },
  { source: '2', target: '4', trades: 2 },
  { source: '2', target: '6', trades: 1 },
  { source: '3', target: '4', trades: 1 },
  { source: '4', target: '5', trades: 1 },
  { source: '5', target: '6', trades: 2 }
]

export const NetworkGraph = () => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    const width = 300
    const height = 200
    
    svg.selectAll("*").remove()
    
    const simulation = d3.forceSimulation(mockNodes as Node[])
      .force("link", d3.forceLink(mockLinks).id((d: any) => d.id).distance(60))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))

    const link = svg.append("g")
      .selectAll("line")
      .data(mockLinks)
      .enter().append("line")
      .attr("stroke", "hsl(var(--border))")
      .attr("stroke-width", (d: any) => Math.sqrt(d.trades))

    const node = svg.append("g")
      .selectAll("circle")
      .data(mockNodes)
      .enter().append("circle")
      .attr("r", (d: any) => Math.sqrt(d.connections) + 3)
      .attr("fill", (d: any) => {
        const colors: { [key: string]: string } = {
          'Tech': 'hsl(var(--primary))',
          'Design': 'hsl(var(--secondary))',
          'Legal': 'hsl(var(--accent))',
          'Food': 'hsl(var(--destructive))',
          'Creative': 'hsl(var(--muted-foreground))'
        }
        return colors[d.category] || 'hsl(var(--muted-foreground))'
      })
      .attr("stroke", "white")
      .attr("stroke-width", 2)

    const labels = svg.append("g")
      .selectAll("text")
      .data(mockNodes)
      .enter().append("text")
      .text((d: any) => d.name)
      .attr("font-size", "10px")
      .attr("text-anchor", "middle")
      .attr("fill", "hsl(var(--foreground))")

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y)

      labels
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y + 20)
    })

    return () => {
      simulation.stop()
    }
  }, [])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex-1">
          Trade Network
        </CardTitle>
        <Network className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <svg
          ref={svgRef}
          width="100%"
          height="200"
          viewBox="0 0 300 200"
          className="border rounded-lg bg-card"
        />
        <div className="mt-3 text-xs text-muted-foreground space-y-1">
          <p>• Larger circles = more connections</p>
          <p>• Thicker lines = more trades</p>
          <p>• Colors represent categories</p>
        </div>
      </CardContent>
    </Card>
  )
}