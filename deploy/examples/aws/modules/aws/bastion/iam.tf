# bastion instance profile and role
resource "aws_iam_instance_profile" "bastion" {
  name = "${var.name_prefix}-ec2-instance-profile-${local.unique_id}"
  role = aws_iam_role.bastion.name
}

resource "aws_iam_role" "bastion" {
  name               = "${var.name_prefix}-ec2-assume-role-${local.unique_id}"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

resource "aws_iam_role_policy" "bastion" {
  name   = "${var.name_prefix}-ec2-assume-role-policy-${local.unique_id}"
  role   = aws_iam_role.bastion.id
  policy = data.aws_iam_policy_document.bastion.json
}

data "aws_iam_policy_document" "assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "bastion" {
  statement {
    effect    = "Allow"
    actions   = ["ec2:DescribeInstances"]
    resources = ["*"]
  }
}
