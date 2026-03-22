from manim import *

class EulerNumberDerivative(Scene):
    def construct(self):
        axes = Axes(
            x_range=[-2, 2, 1],
            y_range=[0, 8, 2],
            axis_config={"color": BLUE},
        )
        labels = axes.get_axis_labels(x_label="x", y_label="y")

        exp_graph = axes.plot(lambda x: np.exp(x), color=YELLOW, x_range=[-2, 2])
        exp_label = axes.get_graph_label(exp_graph, label=MathTex("y = e^x"), x_val=-1.5)

        # Point of tangency
        x_val = 0
        y_val = np.exp(x_val)
        tangent_line = TangentLine(exp_graph, alpha=0.5, length=4, color=RED)
        tangent_label = MathTex("y = e^x").next_to(tangent_line, RIGHT).set_color(RED)

        # Delta x and Delta y
        delta_x = Line(
            axes.c2p(x_val, y_val), axes.c2p(x_val + 1, y_val), color=GREEN
        )
        delta_y = Line(
            axes.c2p(x_val + 1, y_val), axes.c2p(x_val + 1, np.exp(x_val + 1)), color=ORANGE
        )

        delta_x_label = MathTex("\\Delta x").next_to(delta_x, DOWN).set_color(GREEN)
        delta_y_label = MathTex("\\Delta y").next_to(delta_y, RIGHT).set_color(ORANGE)

        self.play(Create(axes), Write(labels))
        self.play(Create(exp_graph), Write(exp_label))
        self.wait(1)
        self.play(Create(tangent_line), Write(tangent_label))
        self.wait(1)
        self.play(Create(delta_x), Write(delta_x_label))
        self.play(Create(delta_y), Write(delta_y_label))
        self.wait(2)