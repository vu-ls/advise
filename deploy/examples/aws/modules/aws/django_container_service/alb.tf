# load balancer definition for app
# note: name must be <32 chars, so we foreshorten
resource "aws_lb" "default" {
  name                       = "alb-${local.unique_id}"
  internal                   = false
  load_balancer_type         = "application"
  preserve_host_header       = true
  security_groups            = [aws_security_group.lb.id]
  subnets                    = var.network.public_subnets
  drop_invalid_header_fields = true

  enable_deletion_protection = var.deletion_protection
}

resource "aws_alb_target_group" "default" {
  name        = "alb-tg-${local.unique_id}"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = var.network.vpc_id
  target_type = "ip"

  health_check {
    healthy_threshold   = "3"
    interval            = "10"
    protocol            = "HTTP"
    matcher             = "200"
    timeout             = "5"
    path                = "/health"
    unhealthy_threshold = "2"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_alb_listener" "https" {
  load_balancer_arn = aws_lb.default.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = module.lb_cert.arn

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "403 Forbidden"
      status_code  = "403"
    }
  }
}

# lock alb to cloudfront
resource "aws_alb_listener_rule" "https_cf_restrict" {
  listener_arn = aws_alb_listener.https.arn

  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.default.arn
  }

  condition {
    http_header {
      http_header_name = local.cf_protection_header.http_header_name
      values           = [local.cf_protection_header.http_header_value]
    }
  }
}
