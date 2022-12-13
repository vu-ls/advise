# get zone ref
data "aws_route53_zone" "primary" {
  name = var.domain_name
}

# bastion hostname
resource "aws_route53_record" "bastion" {
  zone_id    = data.aws_route53_zone.primary.zone_id
  name       = var.fqdn
  type       = "A"
  ttl        = 60
  records    = [aws_instance.bastion.public_ip]
  depends_on = [aws_instance.bastion]
}
