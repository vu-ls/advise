from django.conf import settings
from django.test import TestCase
from ..models import Case

class CaseTest(TestCase):
    """ Test module for Case model """

    def setUp(self):
        Case.objects.create(case_id = '123456', title='Test Case', summary="This is a summary of test case")

    def test_case(self):

        c = Case.objects.get(case_id='123456')

        self.assertEqual(c.full_title, f"CASE#123456: Test Case")

