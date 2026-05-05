# Using AWS Lab environment pre-existing LabRole instead of creating new roles
data "aws_iam_role" "lab_role" {
  name = "LabRole"
}
