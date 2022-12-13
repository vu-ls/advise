output "fqdn" {
  value = aws_route53_record.bastion.fqdn
}

output "instance_profile_role_id" {
  value = aws_iam_role.bastion.id
}

output "private_ip" {
  value = aws_instance.bastion.private_ip
}
