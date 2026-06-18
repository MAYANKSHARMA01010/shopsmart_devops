# Security Group for the Application Load Balancer
# Only port 80 is open to the internet. The ALB internally routes /api/*
# to the backend container on port 5001 — that port must NOT be public.
resource "aws_security_group" "alb_sg" {
  name        = "${var.project_name}-alb-sg"
  description = "Allow HTTP inbound to ALB only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from internet"
    protocol    = "tcp"
    from_port   = 80
    to_port     = 80
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-alb-sg"
  }
}

# Application Load Balancer
resource "aws_lb" "ecs_alb" {
  name               = "${var.project_name}-ecs-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  tags = {
    Name = "${var.project_name}-ecs-alb"
  }
}

# Target Group for Frontend
resource "aws_lb_target_group" "frontend_tg" {
  name        = "${var.project_name}-frontend-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
    matcher             = "200"
  }
}

# Target Group for Backend
# The TG health check goes DIRECTLY to the container on port 5001.
# The backend Express app serves /health at root — NOT /api/health.
# /api is only a prefix added by the ALB routing rule, not by the app.
resource "aws_lb_target_group" "backend_tg" {
  name                 = "${var.project_name}-backend-tg"
  port                 = 5001
  protocol             = "HTTP"
  vpc_id               = aws_vpc.main.id
  target_type          = "ip"
  # Speed up rolling deployments — don't wait 300s to drain old tasks
  deregistration_delay = 30

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
    matcher             = "200"
  }
}

# Single Listener for all traffic (Port 80)
resource "aws_lb_listener" "http_listener" {
  load_balancer_arn = aws_lb.ecs_alb.arn
  port              = "80"
  protocol          = "HTTP"

  # Default: Send everything to the Frontend
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend_tg.arn
  }
}

# Path-Based Rule: Send /api and /api/* to the Backend
# "/api/*" catches /api/users, /api/products, etc.
# "/api"   catches the exact path /api (no trailing slash) — without this
#           a request to bare /api returns a 404 from the frontend container.
resource "aws_lb_listener_rule" "api_routing" {
  listener_arn = aws_lb_listener.http_listener.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend_tg.arn
  }

  condition {
    path_pattern {
      values = ["/api", "/api/*"]
    }
  }
}

output "ecs_alb_dns_name" {
  value       = aws_lb.ecs_alb.dns_name
  description = "The DNS name of the Application Load Balancer"
}
