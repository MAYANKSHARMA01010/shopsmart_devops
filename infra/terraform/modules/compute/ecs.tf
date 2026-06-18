# CloudWatch Log Group for ECS task logs
resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/${var.project_name}"
  retention_in_days = 7

  tags = {
    Project = var.project_name
  }
}

# Backend Task Definition
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = data.aws_iam_role.lab_role.arn
  task_role_arn            = data.aws_iam_role.lab_role.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${aws_ecr_repository.shopsmart_server.repository_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 5001
          hostPort      = 5001
        }
      ]
      environment = [
        {
          name  = "DATABASE_URL"
          value = var.database_url
        },
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "FRONTEND_SERVER_URL"
          value = "http://${aws_lb.ecs_alb.dns_name}"
        },
        {
          name  = "BACKEND_SERVER_URL"
          value = "http://${aws_lb.ecs_alb.dns_name}/api"
        },
        # CORS_ORIGIN tells the Express CORS middleware exactly which
        # origin to allow. Since the frontend is served from the same
        # ALB domain, same-origin requests won't trigger CORS at all,
        # but this covers any direct API calls made from the browser.
        {
          name  = "CORS_ORIGIN"
          value = "http://${aws_lb.ecs_alb.dns_name}"
        },
        {
          name  = "REDIS_SERVER_URL"
          value = var.redis_url
        },
        {
          name  = "SERVER_PORT"
          value = "5001"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }
    }
  ])
}


resource "aws_ecs_service" "backend" {
  name                              = "${var.project_name}-backend-service"
  cluster                           = aws_ecs_cluster.shopsmart_cluster.id
  task_definition                   = aws_ecs_task_definition.backend.arn
  launch_type                       = "FARGATE"
  desired_count                     = 1
  health_check_grace_period_seconds = 60
  # Allows `terraform apply` (and CI/CD) to force a new task revision
  # even when the task definition hasn't changed (e.g. new image pushed
  # to ECR under the same :latest tag).
  force_new_deployment              = true

  deployment_circuit_breaker {
    enable   = true   # roll back automatically if tasks keep failing
    rollback = true
  }

  network_configuration {
    subnets          = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend_tg.arn
    container_name   = "backend"
    container_port   = 5001
  }

  depends_on = [aws_lb_listener.http_listener]
}

# Frontend Task Definition
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.project_name}-frontend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = data.aws_iam_role.lab_role.arn
  task_role_arn            = data.aws_iam_role.lab_role.arn

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "${aws_ecr_repository.shopsmart_client.repository_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "NEXT_PUBLIC_SERVER_BACKEND_URL"
          value = "/api"
        },
        {
          name  = "NEXT_PUBLIC_SERVER_FRONTEND_URL"
          value = "http://${aws_lb.ecs_alb.dns_name}"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "frontend"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "frontend" {
  name                              = "${var.project_name}-frontend-service"
  cluster                           = aws_ecs_cluster.shopsmart_cluster.id
  task_definition                   = aws_ecs_task_definition.frontend.arn
  launch_type                       = "FARGATE"
  desired_count                     = 1
  health_check_grace_period_seconds = 60
  force_new_deployment              = true

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend_tg.arn
    container_name   = "frontend"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.http_listener]
}
