import json
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from django.test import TestCase, Client, modify_settings
from django.urls import reverse, reverse_lazy
from cvdp.models import *
from django.contrib.auth.models import Group
from authapp.models import APIToken, User
from cvdp.cases.serializers import *
from cvdp.components.models import *
from cvdp.components.serializers import *
import logging

#test vuls and vul status and scoring endpoints

class VulTests(APITestCase):

    def setUp(self):
        self.api_client = APIClient()
        self.coord_user = User.objects.create(email='coordinator', password='Pas$w0rd', is_coordinator=True)
        self.reporter_user = User.objects.create(email='reporter', password='Pas$w0rd')
        self.vendor_user = User.objects.create(email='vendor', password='Pas$w0rd')
        group = Group.objects.create(name='vendor')
        GroupProfile.objects.create(group=group)
        group.user_set.add(self.vendor_user)

        self.case = Case.objects.create(case_id = '111111', title='Test Case', summary="This is a summary of test case", status=Case.ACTIVE_STATUS)
        cp = CaseParticipant.objects.create(case=self.case, group=group)
        thread = CaseThread.objects.filter(case=self.case, archived=False).first()
        CaseThreadParticipant.objects.create(thread=thread, participant=cp)

        contact = Contact.objects.get(user=self.coord_user)
        CaseParticipant.objects.create(case=self.case, contact=contact, role="owner")
        Vulnerability.objects.create(case=self.case, description="Let's do this!")


    def test_coordinator_get_vuls(self):
        self.api_client.force_authenticate(user=self.coord_user)

        response = self.api_client.get(
            reverse('cvdp:vulapi', args=['111111']))

        vuls = Vulnerability.objects.filter(case=self.case, deleted=False)
        serializer = VulSerializer(vuls, many=True)
        self.assertEqual(response.data, serializer.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


    def test_coordinator_add_vul(self):
        self.api_client.force_authenticate(user=self.coord_user)

        valid_payload = {
            'description': 'some vul is bad'
        }
        response = self.api_client.post(
            reverse('cvdp:vulapi', args=['111111']),
            data=json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)


    def test_coordinator_add_vul_invalid(self):
        self.api_client.force_authenticate(user=self.coord_user)

        invalid_payload = {
            'cve': 'CVE-2021-0234'
        }
        #description is required
        response = self.api_client.post(
            reverse('cvdp:vulapi', args=['111111']),
            data=json.dumps(invalid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_coordinator_get_vul(self):
        self.api_client.force_authenticate(user=self.coord_user)

        vul = Vulnerability.objects.filter(case=self.case, deleted=False).first()

        response = self.api_client.get(
            reverse('cvdp:vulapi-detail', args=[vul.id]))

        vuls = Vulnerability.objects.filter(case=self.case, deleted=False).first()
        serializer = VulSerializer(vuls)
        self.assertEqual(response.data, serializer.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_coordinator_update_vul(self):
        self.api_client.force_authenticate(user=self.coord_user)

        vul = Vulnerability.objects.filter(case=self.case, deleted=False).first()

        valid_payload = {
            'cve': 'cve-2023-21230'
        }

        response = self.api_client.patch(
            reverse('cvdp:vulapi-detail', args=[vul.id]),
            data=json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)


    def test_coordinator_delete_vul(self):
        self.api_client.force_authenticate(user=self.coord_user)
        vul = Vulnerability.objects.filter(case=self.case, deleted=False).first()
        response = self.api_client.delete(
            reverse('cvdp:vulapi-detail', args=[vul.id])
        )
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)


    def test_coordinator_score_cvss(self):
        self.api_client.force_authenticate(user=self.coord_user)

        vul = Vulnerability.objects.filter(case=self.case, deleted=False).first()

        valid_payload = {
            'AV': 'N',
            'AC': 'H',
            'PR': 'L',
            'UI': 'R',
            'S': 'U',
            'C': 'N',
            'I': 'L',
            'A': 'H',
            'E': 'X',
            'RL': 'X',
            'RC': 'X',
            'vector': 'CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:U/C:N/I:L/A:H',
            'score': '5.4',
            'severity': 'Medium'}


        response = self.api_client.post(
            reverse('cvdp:cvssapi', args=[vul.id]),
            data=json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        #now get the cvss

        response = self.api_client.get(
            reverse('cvdp:cvssapi', args=[vul.id]))

        cvss = VulCVSS.objects.filter(vul=vul).first()
        serializer = CVSSSerializer(cvss)
        self.assertEqual(response.data, serializer.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        valid_payload = {
            'AV': 'A',
            'AC': 'L',
            'PR': 'H',
            'UI': 'R',
            'S': 'U',
            'C': 'N',
            'I': 'L',
            'A': 'H',
            'E': 'X',
            'RL': 'X',
            'RC': 'X',
            'vector': 'CVSS:3.1/AV:A/AC:L/PR:H/UI:R/S:U/C:N/I:L/A:H',
            'score': '4.9',
            'severity': 'Medium'}

        response = self.api_client.patch(
            reverse('cvdp:cvssapi', args=[vul.id]),
            data=json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        #test remove
        response = self.api_client.delete(
            reverse('cvdp:cvssapi', args=[vul.id]))

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

    def test_coordinator_score_ssvc(self):
        self.api_client.force_authenticate(user=self.coord_user)

        vul = Vulnerability.objects.filter(case=self.case, deleted=False).first()

        valid_payload = {'decision_tree':
                         [{'label': 'Exploitation', 'value': 'none'},
                          {'label': 'Automatable', 'value': 'yes'},
                          {'label': 'Technical Impact', 'value': 'total'},
                          {'label': 'Public Well-being Impact', 'value': 'Irreversible'},
                          {'label': 'Mission Prevalence', 'value': 'Support'},
                          {'label': 'Mission & Well-being', 'value': 'high'},
                          {'label': 'Decision', 'value': 'Attend'}],
                         'tree_type': 'CISA-Coordinator-v2.0.3',
                         'final_decision': 'Attend',
                         'vector': 'SSVCv2/E:N/A:Y/T:T/B:I/P:S/M:H/D:A/2023-03-13T15:16:49Z/'}

        response = self.api_client.post(
            reverse('cvdp:ssvcapi', args=[vul.id]),
            data=json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        response = self.api_client.get(
            reverse('cvdp:ssvcapi', args=[vul.id]))

        cvss = VulSSVC.objects.filter(vul=vul).first()
        serializer = SSVCSerializer(cvss)
        self.assertEqual(response.data, serializer.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        valid_payload = {'decision_tree':
                         [{'label': 'Exploitation', 'value': 'partial'},
                          {'label': 'Automatable', 'value': 'no'},
                          {'label': 'Technical Impact', 'value': 'total'},
                          {'label': 'Public Well-being Impact', 'value': 'Irreversible'},
                          {'label': 'Mission Prevalence', 'value': 'Support'},
                          {'label': 'Mission & Well-being', 'value': 'high'},
                          {'label': 'Decision', 'value': 'Attend'}],
                         'tree_type': 'CISA-Coordinator-v2.0.3',
                         'final_decision': 'Attend',
                         'vector': 'SSVCv2/E:N/A:Y/T:T/B:I/P:S/M:H/D:A/2023-03-13T15:16:49Z/'}

        response = self.api_client.patch(
            reverse('cvdp:ssvcapi', args=[vul.id]),
            data=json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)


        response = self.api_client.delete(
            reverse('cvdp:ssvcapi', args=[vul.id]))

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)


    def test_vendor_get_ssvc(self):
        self.api_client.force_authenticate(user=self.vendor_user)

        vul = Vulnerability.objects.filter(case=self.case, deleted=False).first()
        dec_tree = [{'label': 'Exploitation', 'value': 'partial'},
                          {'label': 'Automatable', 'value': 'no'},
                          {'label': 'Technical Impact', 'value': 'total'},
                          {'label': 'Public Well-being Impact', 'value': 'Irreversible'},
                          {'label': 'Mission Prevalence', 'value': 'Support'},
                          {'label': 'Mission & Well-being', 'value': 'high'},
                          {'label': 'Decision', 'value': 'Attend'}]
        VulSSVC.objects.create(vul=vul, decision_tree=dec_tree,
                               tree_type='CISA-Coordinator',
                               final_decision='Attend',
                               vector='SSVCv2/E:N/A:Y/T:T/B:I/P:S/M:H/D:A/2023-03-13T15:16:49Z/')

        response = self.api_client.get(
            reverse('cvdp:ssvcapi', args=[vul.id]))

        cvss = VulSSVC.objects.filter(vul=vul).first()
        serializer = SSVCSerializer(cvss)
        self.assertEqual(response.data, serializer.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        #test vendor update ssvc - should be denied
        valid_payload = {'decision_tree':
                         [{'label': 'Exploitation', 'value': 'partial'},
                          {'label': 'Automatable', 'value': 'no'},
                          {'label': 'Technical Impact', 'value': 'total'},
                          {'label': 'Public Well-being Impact', 'value': 'Irreversible'},
                          {'label': 'Mission Prevalence', 'value': 'Support'},
                          {'label': 'Mission & Well-being', 'value': 'high'},
                          {'label': 'Decision', 'value': 'Attend'}],
                         'tree_type': 'CISA-Coordinator-v2.0.3',
                         'final_decision': 'Attend',
                         'vector': 'SSVCv2/E:N/A:Y/T:T/B:I/P:S/M:H/D:A/2023-03-13T15:16:49Z/'}

        response = self.api_client.patch(
            reverse('cvdp:ssvcapi', args=[vul.id]),
            data=json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reporter_get_ssvc(self):
        self.api_client.force_authenticate(user=self.reporter_user)

        vul = Vulnerability.objects.filter(case=self.case, deleted=False).first()
        dec_tree = [{'label': 'Exploitation', 'value': 'partial'},
                          {'label': 'Automatable', 'value': 'no'},
                          {'label': 'Technical Impact', 'value': 'total'},
                          {'label': 'Public Well-being Impact', 'value': 'Irreversible'},
                          {'label': 'Mission Prevalence', 'value': 'Support'},
                          {'label': 'Mission & Well-being', 'value': 'high'},
                          {'label': 'Decision', 'value': 'Attend'}]
        VulSSVC.objects.create(vul=vul, decision_tree=dec_tree,
                               tree_type='CISA-Coordinator',
                               final_decision='Attend',
                               vector='SSVCv2/E:N/A:Y/T:T/B:I/P:S/M:H/D:A/2023-03-13T15:16:49Z/')

        response = self.api_client.get(
            reverse('cvdp:ssvcapi', args=[vul.id]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_vendor_add_ssvc(self):
        self.api_client.force_authenticate(user=self.vendor_user)

        vul = Vulnerability.objects.filter(case=self.case, deleted=False).first()

        valid_payload = {'decision_tree':
                         [{'label': 'Exploitation', 'value': 'none'},
                          {'label': 'Automatable', 'value': 'yes'},
                          {'label': 'Technical Impact', 'value': 'total'},
                          {'label': 'Public Well-being Impact', 'value': 'Irreversible'},
                          {'label': 'Mission Prevalence', 'value': 'Support'},
                          {'label': 'Mission & Well-being', 'value': 'high'},
                          {'label': 'Decision', 'value': 'Attend'}],
                         'tree_type': 'CISA-Coordinator-v2.0.3',
                         'final_decision': 'Attend',
                         'vector': 'SSVCv2/E:N/A:Y/T:T/B:I/P:S/M:H/D:A/2023-03-13T15:16:49Z/'}

        response = self.api_client.post(
            reverse('cvdp:ssvcapi', args=[vul.id]),
            data=json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)




    def test_vendor_get_cvss(self):
        self.api_client.force_authenticate(user=self.vendor_user)

        vul = Vulnerability.objects.filter(case=self.case, deleted=False).first()
        VulCVSS.objects.create(vul=vul, AV='A',AC='L', PR='H', UI='R', S='U', C='N',
                               I='L', A='H', E='X', RL='X', RC='X',
                               vector='CVSS:3.1/AV:A/AC:L/PR:H/UI:R/S:U/C:N/I:L/A:H',
                               score='4.0',
                               severity='Medium')

        response = self.api_client.get(
            reverse('cvdp:cvssapi', args=[vul.id]))

        cvss = VulCVSS.objects.filter(vul=vul).first()
        serializer = CVSSSerializer(cvss)
        self.assertEqual(response.data, serializer.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


    def test_vendor_remove_cvss(self):
        self.api_client.force_authenticate(user=self.vendor_user)

        vul = Vulnerability.objects.filter(case=self.case, deleted=False).first()
        VulCVSS.objects.create(vul=vul, AV='A',AC='L', PR='H', UI='R', S='U', C='N',
                               I='L', A='H', E='X', RL='X', RC='X',
                               vector='CVSS:3.1/AV:A/AC:L/PR:H/UI:R/S:U/C:N/I:L/A:H',
                               score='4.0',
                               severity='Medium')

        response = self.api_client.delete(
            reverse('cvdp:cvssapi', args=[vul.id]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reporter_get_cvss(self):
        self.api_client.force_authenticate(user=self.reporter_user)

        vul = Vulnerability.objects.filter(case=self.case, deleted=False).first()
        VulCVSS.objects.create(vul=vul, AV='A',AC='L', PR='H', UI='R', S='U', C='N',
                               I='L', A='H', E='X', RL='X', RC='X',
                               vector='CVSS:3.1/AV:A/AC:L/PR:H/UI:R/S:U/C:N/I:L/A:H',
                               score='4.0',
                               severity='Medium')

        response = self.api_client.get(
            reverse('cvdp:cvssapi', args=[vul.id]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_coordinator_score_cvss_invalid(self):
        self.api_client.force_authenticate(user=self.coord_user)

        vul = Vulnerability.objects.filter(case=self.case, deleted=False).first()

        invalid_payload = {
            'AV': 'N',
            'AC': 'H',
            'PR': 'L',
            'I': 'L',
            'A': 'H',
            'E': 'X',
            'RL': 'X',
            'RC': 'X',
            'vector': 'CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:U/C:N/I:L/A:H',
            'score': '5.4',
            'severity': 'Medium'}

        response = self.api_client.post(
            reverse('cvdp:cvssapi', args=[vul.id]),
            data=json.dumps(invalid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


    def test_vendor_get_vuls(self):
        self.api_client.force_authenticate(user=self.vendor_user)

        response = self.api_client.get(
            reverse('cvdp:vulapi', args=['111111']))

        vuls = Vulnerability.objects.filter(case=self.case, deleted=False)
        serializer = VulSerializer(vuls, many=True)
        self.assertEqual(response.data, serializer.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


    def test_vendor_add_vul(self):
        self.api_client.force_authenticate(user=self.vendor_user)

        valid_payload = {
            'description': 'some vul is bad'
        }
        response = self.api_client.post(
            reverse('cvdp:vulapi', args=['111111']),
            data=json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_vendor_get_vul(self):
        self.api_client.force_authenticate(user=self.vendor_user)

        vul = Vulnerability.objects.filter(case=self.case, deleted=False).first()

        response = self.api_client.get(
            reverse('cvdp:vulapi-detail', args=[vul.id]))

        vuls = Vulnerability.objects.filter(case=self.case, deleted=False).first()
        serializer = VulSerializer(vuls)
        self.assertEqual(response.data, serializer.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_vendor_update_vul(self):
        self.api_client.force_authenticate(user=self.vendor_user)

        vul = Vulnerability.objects.filter(case=self.case, deleted=False).first()

        valid_payload = {
            'cve': 'cve-2023-21230'
        }

        response = self.api_client.patch(
            reverse('cvdp:vulapi-detail', args=[vul.id]),
            data=json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_vendor_delete_vul(self):
        self.api_client.force_authenticate(user=self.vendor_user)
        vul = Vulnerability.objects.filter(case=self.case, deleted=False).first()
        response = self.api_client.delete(
            reverse('cvdp:vulapi-detail', args=[vul.id])
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_reporter_get_vuls(self):
        self.api_client.force_authenticate(user=self.reporter_user)

        response = self.api_client.get(
            reverse('cvdp:vulapi', args=['111111']))

        vuls = Vulnerability.objects.filter(case=self.case, deleted=False)
        serializer = VulSerializer(vuls, many=True)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_reporter_add_vul(self):
        self.api_client.force_authenticate(user=self.reporter_user)

        valid_payload = {
            'description': 'some vul is bad'
        }
        response = self.api_client.post(
            reverse('cvdp:vulapi', args=['111111']),
            data=json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_reporter_get_vul(self):
        self.api_client.force_authenticate(user=self.reporter_user)

        vul = Vulnerability.objects.filter(case=self.case, deleted=False).first()

        response = self.api_client.get(
            reverse('cvdp:vulapi-detail', args=[vul.id]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_reporter_update_vul(self):
        self.api_client.force_authenticate(user=self.reporter_user)

        vul = Vulnerability.objects.filter(case=self.case, deleted=False).first()

        valid_payload = {
            'cve': 'cve-2023-21230'
        }

        response = self.api_client.patch(
            reverse('cvdp:vulapi-detail', args=[vul.id]),
            data=json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_reporter_delete_vul(self):
        self.api_client.force_authenticate(user=self.reporter_user)
        vul = Vulnerability.objects.filter(case=self.case, deleted=False).first()
        response = self.api_client.delete(
            reverse('cvdp:vulapi-detail', args=[vul.id])
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_vendor_score_cvss(self):
        self.api_client.force_authenticate(user=self.vendor_user)

        vul = Vulnerability.objects.filter(case=self.case, deleted=False).first()

        valid_payload = {
            'AV': 'N',
            'AC': 'H',
            'PR': 'L',
            'UI': 'R',
            'S': 'U',
            'C': 'N',
            'I': 'L',
            'A': 'H',
            'E': 'X',
            'RL': 'X',
            'RC': 'X',
            'vector': 'CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:U/C:N/I:L/A:H',
            'score': '5.4',
            'severity': 'Medium'}


        response = self.api_client.post(
            reverse('cvdp:cvssapi', args=[vul.id]),
            data=json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reporter_score_cvss(self):
        self.api_client.force_authenticate(user=self.reporter_user)

        vul = Vulnerability.objects.filter(case=self.case, deleted=False).first()

        valid_payload = {
            'AV': 'N',
            'AC': 'H',
            'PR': 'L',
            'UI': 'R',
            'S': 'U',
            'C': 'N',
            'I': 'L',
            'A': 'H',
            'E': 'X',
            'RL': 'X',
            'RC': 'X',
            'vector': 'CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:U/C:N/I:L/A:H',
            'score': '5.4',
            'severity': 'Medium'}


        response = self.api_client.post(
            reverse('cvdp:cvssapi', args=[vul.id]),
            data=json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    #TEST STATUS

class VulStatusTests(APITestCase):

    def setUp(self):
        self.api_client = APIClient()
        self.coord_user = User.objects.create(email='coordinator', password='Pas$w0rd', is_coordinator=True)
        self.reporter_user = User.objects.create(email='reporter', password='Pas$w0rd')
        self.vendor_user = User.objects.create(email='vendor', password='Pas$w0rd')
        group = Group.objects.create(name='vendor')
        GroupProfile.objects.create(group=group)
        group.user_set.add(self.vendor_user)

        self.case = Case.objects.create(case_id = '111111', title='Test Case', summary="This is a summary of test case", status=Case.ACTIVE_STATUS)
        cp = CaseParticipant.objects.create(case=self.case, group=group)
        contact = Contact.objects.get(user=self.coord_user)
        CaseParticipant.objects.create(case=self.case, contact=contact, role="owner")
        Vulnerability.objects.create(case=self.case, description="Let's do this!")
        Component.objects.create(name='django', version='1.2.3')

    def test_coordinator_add_component_status(self):
        self.api_client.force_authenticate(user=self.coord_user)

        vul = Vulnerability.objects.filter(case=self.case).first()

        valid_payload = {
            'status': 'Affected',
            'vuls':[vul.id],
            'version': '1.0.0.1',
            'statement': "WE affected",
            'component': 'django'
        }
        response = self.api_client.post(
            reverse('cvdp:statusapi', args=['111111']),
            data=json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        #test get status

        response = self.api_client.get(
            reverse('cvdp:statusapi', args=['111111']))

        cs = ComponentStatus.objects.filter(vul__case=self.case)
        serializer = StatusSummarySerializer(cs, many=True)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, serializer.data)

        #get detailed status by component
        comp = ComponentStatus.objects.filter(component__name='django').first()
        response = self.api_client.get(
            reverse('cvdp:statusapi-detail', args=[comp.id]))


        serializer = StatusSummarySerializer(comp)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, serializer.data)

        #test status update

        valid_payload = {
            'status': 'Not Affected',
            'vuls':[vul.id],
            'version': '1.0.0.1',
            'statement': "WE affected",
            'component': 'django'
        }
        response = self.api_client.patch(
            reverse('cvdp:statusapi-detail', args=[comp.id]),
            data=json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)


        #test delete
        response = self.api_client.delete(
            reverse('cvdp:statusapi-detail', args=[comp.id]))
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

    def test_vendor_add_component_status(self):
        self.api_client.force_authenticate(user=self.vendor_user)

        vul = Vulnerability.objects.filter(case=self.case).first()

        valid_payload = {
            'status': 'Affected',
            'vuls':[vul.id],
            'version': '1.0.0.1',
            'statement': "WE affected",
            'component': 'django'
        }
        response = self.api_client.post(
            reverse('cvdp:statusapi', args=['111111']),
            data=json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

         #test get status

        response = self.api_client.get(
            reverse('cvdp:statusapi', args=['111111']))

        cs = ComponentStatus.objects.filter(vul__case=self.case)
        serializer = StatusSummarySerializer(cs, many=True)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, serializer.data)

        #get detailed status by component
        comp = ComponentStatus.objects.filter(component__name='django').first()
        response = self.api_client.get(
            reverse('cvdp:statusapi-detail', args=[comp.id]))


        serializer = StatusSummarySerializer(comp)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, serializer.data)

        #test status update

        valid_payload = {
            'status': 'Not Affected',
            'vuls':[vul.id],
            'version': '1.0.0.1',
            'statement': "WE affected",
            'component': 'django'
        }
        response = self.api_client.patch(
            reverse('cvdp:statusapi-detail', args=[comp.id]),
            data=json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)


        #test delete
        response = self.api_client.delete(
            reverse('cvdp:statusapi-detail', args=[comp.id]))
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

    def test_vendor_other_component_status(self):
        self.api_client.force_authenticate(user=self.vendor_user)

        vul = Vulnerability.objects.filter(case=self.case).first()
        c = Component.objects.create(name="django", version="1.2.3")
        
        cs = ComponentStatus.objects.create(vul=vul, component=c)
        cs.add_revision(StatusRevision(version_value="1.2.3", status=1, statement='Vendor should not see this'))

        #this vendor shouldn't be able to see the above status
        response = self.api_client.get(
            reverse('cvdp:statusapi', args=['111111']))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

        #vendor should not be able to update/delete this status either
        valid_payload = {
            'status': 'Not Affected',
            'vuls':[vul.id],
            'version': '1.0.0.1',
            'statement': "WE affected",
            'component': 'django'
        }
        response = self.api_client.patch(
            reverse('cvdp:statusapi-detail', args=[cs.id]),
            data=json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self.api_client.delete(
            reverse('cvdp:statusapi-detail', args=[cs.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        
    def test_reporter_get_status(self):

        self.api_client.force_authenticate(user=self.reporter_user)

        vul = Vulnerability.objects.filter(case=self.case).first()
        c = Component.objects.create(name="django", version="1.2.3")

        cs = ComponentStatus.objects.create(vul=vul, component=c)
        cs.add_revision(StatusRevision(version_value="1.2.3", status=1, statement='Vendor should not see this'))
        
        #this reoprter shouldn't be able to see the above status
        response = self.api_client.get(
            reverse('cvdp:statusapi', args=['111111']))
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        #vendor should not be able to update/delete this status either
        valid_payload = {
            'status': 'Not Affected',
            'vuls':[vul.id],
            'version': '1.0.0.1',
            'statement': "WE affected",
            'component': 'django'
        }
        response = self.api_client.patch(
            reverse('cvdp:statusapi-detail', args=[cs.id]),
            data=json.dumps(valid_payload),
            content_type='application/json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        response = self.api_client.delete(
            reverse('cvdp:statusapi-detail', args=[cs.id]))
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
