# ==========================================
# EC2 App / Jump Host
# ==========================================
# A small Amazon Linux 2 instance in the public subnet for ad-hoc admin,
# debugging, and as proof-of-EC2 in the rubric.

data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

resource "aws_security_group" "ec2_app" {
  name        = "${var.project_name}-ec2-sg"
  description = "Allow SSH and HTTP to EC2 host"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    protocol    = "tcp"
    from_port   = 22
    to_port     = 22
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
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
    Name = "${var.project_name}-ec2-sg"
  }
}

resource "aws_instance" "app_host" {
  ami                         = data.aws_ami.amazon_linux_2.id
  instance_type               = "t3.micro"
  subnet_id                   = aws_subnet.public_1.id
  vpc_security_group_ids      = [aws_security_group.ec2_app.id]
  associate_public_ip_address = true

  user_data = <<-EOF
    #!/bin/bash
    yum update -y
    amazon-linux-extras install -y docker
    systemctl enable --now docker
    usermod -a -G docker ec2-user
  EOF

  tags = {
    Name    = "${var.project_name}-app-host"
    Project = var.project_name
  }
}

output "ec2_public_ip" {
  description = "Public IP of the app host EC2 instance"
  value       = aws_instance.app_host.public_ip
}
