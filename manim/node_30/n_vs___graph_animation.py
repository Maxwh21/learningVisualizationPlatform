from manim import *

class EulersNumberScene(Scene):
    def construct(self):
        axes = Axes(
            x_range=[0, 20, 1],
            y_range=[0, 3.5, 0.5],  # Adjusted y_range to zoom out
            axis_config={"color": BLUE},
        )
        
        x_label = MathTex("n").next_to(axes.x_axis, DOWN)
        y_label = MathTex("A").next_to(axes.y_axis, LEFT)
        
        self.play(Create(axes), Write(x_label), Write(y_label))
        
        # Create the graph of A as a function of n for different compounding periods
        n_values = range(1, 21)
        A_values = [1 * (1 + 1/n)**(n * 1) for n in n_values]  # t = 1, P = 1, r = 1
        
        graph = axes.plot(lambda n: 1 * (1 + 1/n)**(n * 1), color=YELLOW)
        self.play(Create(graph))
        
        # Show the convergence to e
        e_line = DashedLine(axes.c2p(0, 2.718), axes.c2p(20, 2.718), color=RED)
        self.play(Create(e_line))
        
        e_label = MathTex("e \\approx 2.718").next_to(e_line, RIGHT)
        self.play(Write(e_label))
        
        self.wait(2)