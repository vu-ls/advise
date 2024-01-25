resource "aws_instance" "bastion" {
  ami                         = local.ami_id
  instance_type               = var.instance_type
  subnet_id                   = var.network.public_subnets[0]
  key_name                    = var.ssh_key_name
  vpc_security_group_ids      = [aws_security_group.bastion.id]
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.bastion.id

  root_block_device {
    encrypted = true
  }

  metadata_options {
    http_tokens = "required"
  }

  user_data = templatefile(
    "${path.module}/templates/bastion.tplfl",
    {
      #tpl_kms_key                 = aws_kms_key.vault.id
      tpl_aws_region = data.aws_region.current.name
      #account_id                  = data.aws_caller_identity.current.account_id
  })

  tags = {
    "Name" = var.fqdn
  }

  #  lifecycle {
  #    ignore_changes = [
  #      ami,
  #      tags,
  #    ]
  #  }
}
