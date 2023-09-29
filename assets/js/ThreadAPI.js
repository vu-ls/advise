import axios from 'axios';
const API_URL = process.env.API_URL || 'http://localhost:8000/advise';

axios.defaults.xsrfHeaderName = "X-CSRFToken"
axios.defaults.xsrfCookieName = 'csrftoken'


export default class CaseThreadAPI{

    constructor(){
    }

    getUserCaseState(c) {
	console.log(c)
	const url = `${API_URL}/api/case/${c.case}/user/`;
	return axios.get(url).then(response => response.data);
    }

    getCaseNotifications() {
	const url = `${API_URL}/api/case/notifications/`;
        return axios.get(url).then(response => response.data);
    }
    
    getUserAssignments() {
	const url = `${API_URL}/api/user/assignments/`;
        return axios.get(url).then(response => response.data);
    }

    getCaseActivity(c) {
	const url = `${API_URL}/api/case/${c.case_id}/activity/`;
	return axios.get(url).then(response => response.data);
    }

    getMyActivity(c, search=null) {
	let url = `${API_URL}/api/case/activity/`;
	if (c) {
	    url = `${API_URL}/api/case/activity/?page=${c}`;
	    if (search) {
		url = `${url}&q=${search}`;
	    }
	}
        return axios.get(url);
    }

    searchCaseActivity(c, search) {
	const url = `${API_URL}/api/case/${c.case_id}/activity/?q=${search}`;
        return axios.get(url).then(response => response.data);
    }
    
    assignCase(c, name) {
	const url = `${API_URL}/api/case/${c}/assign/`;
	let formField = new FormData();
        formField.append('user', name);
        return axios.post(url, formField).then(response => response.data);
    }
    autoAssignCase(c, name) {
	const url = `${API_URL}/api/case/${c}/assign/`;
	let formField = new FormData();
        formField.append('role', name);
        return axios.post(url, formField).then(response => response.data);
    }

    getArchivedThreads(c) {
	console.log(c);
        const url = `${API_URL}/api/case/${c.case}/threads/archived/`;
        return axios.get(url).then(response => response.data);
    }
    
    getThreads(c) {
	console.log(c);
        const url = `${API_URL}/api/case/${c.case}/threads/`;
        return axios.get(url).then(response => response.data);
    }

    getOfficialThread(c) {
	const url = `${API_URL}/api/case/${c.case}/threads/?official=1`;
        return axios.get(url).then(response => response.data);
    }
    
    getThread(c) {
        const url = `${API_URL}/api/case/thread/${c.id}`;
        return axios.get(url).then(response => response.data);
    }
    deleteThread(c) {
        const url = `${API_URL}/api/case/thread/${c}`;
        return axios.delete(url);
    }
    getPosts(c) {
        const url = `${API_URL}/api/case/thread/${c.id}/posts/`;
	return axios.get(url).then(response => response.data);
    }

    getPostsMax(c) {
	const url = `${API_URL}/api/case/thread/${c}/posts/?page_size=100`;
	return axios.get(url).then(response => response.data);
    }
    
    getPost(c) {
	const url = `${API_URL}/api/case/thread/post/${c.id}/`;
        return axios.get(url).then(response => response.data);
    }

    getPostDiff(c) {
	const url = `${API_URL}/case/thread/post/diff/${c}/`;
	return axios.get(url).then(response=>response.data);
    }
    getThreadParticipants(c) {
	const url = `${API_URL}/api/case/thread/${c}/participants/`;
	return axios.get(url).then(response=>response.data);
    }

    getCaseParticipantSummary(c) {
	const url = `${API_URL}/api/case/${c.case}/participants/summary/`;
        return axios.get(url);
    }

    getCaseReport(c) {
	const url = `${API_URL}/report/add/case/${c.case_id}/`;
        return axios.get(url);
    }

    getOriginalReport(c) {
        const url = `${API_URL}/case/${c}/report/original/`;
        return axios.get(url);
    }
    
    addCaseReport(c, data) {
	console.log(c);
	console.log(data);
	let formField = new FormData();
	for (let k in data) {
	    formField.append(k, data[k])
	}
	const url = `${API_URL}/report/case/${c.case_id}/add/`;
	return axios.post(url, formField).then(response => response.data);
    }
    
    getCaseParticipants(c) {
        const url = `${API_URL}/api/case/${c.case}/participants/`;
        return axios.get(url).then(response=>response.data);
    }

    getCaseOwners(c) {
        const url = `${API_URL}/api/case/${c.case}/participants/?role=owner`;
        return axios.get(url).then(response=>response.data);
    }

    getPinnedPosts(c) {
        const url = `${API_URL}/api/case/thread/${c.id}/posts/?pinned=1`;
        return axios.get(url).then(response => response.data);
    }

    pinPost(c) {
	const data = {'pinned': true};
	const url = `${API_URL}/api/case/thread/post/${c.id}/`;
	return axios.patch(url, data).then(response=>response.data);
    }	

    unpinPost(c) {
        const data = {'pinned': false};
        const url = `${API_URL}/api/case/thread/post/${c.id}/`;
        return axios.patch(url, data).then(response=>response.data);
    }

    getPostsByURL(link) {
	return axios.get(link).then(response => response.data);
    }
    deletePost(c) {
	console.log("IN UPDATE POST");
	const url = `${API_URL}/api/case/thread/post/${c}/`;
	return axios.delete(url).then(response=>response.data);
    }
    editPost(content, post) {
	console.log("IN EDIT POST");
        const data = {'content': content};
        const url = `${API_URL}/api/case/thread/post/${post.id}/`;
        return axios.patch(url, data).then(response=>response.data);
    }
    addPost(data, thread) {
	console.log("IN Add POST");
        const url = `${API_URL}/api/case/thread/${thread.id}/posts/`;
        return axios.post(url, data).then(response=>response.data);
    }
    
    getPostsHTML(c) {
	console.log("IN GETPOSTSHTML");
	const url = `${API_URL}/case/thread/posts/${c.id}/`;
	return axios.get(url).then(response => response.data);
    }
    getParticipants(c) {
	const url = `${API_URL}/api/contacts/`
	return axios.get(url).then(response => response.data);
    }
    createThread(c, subject) {
        const url = `${API_URL}/api/case/${c.case}/threads/`;
	let formField = new FormData();
	formField.append('subject', subject);
        return axios.post(url, formField).then(response => response.data);
    }
    editCaseParticipant(c, role) {
        console.log("IN EDIT CASE PARTICIPANTS");
	const data = {'role': role};
        const url = `${API_URL}/api/case/participant/${c}/`;
        return axios.patch(url, data).then(response=>response.data);
    }

    removeCaseParticipants(c) {
	const requests = c.map((item) => `${API_URL}/api/case/participant/${item}/`);
	return axios.all(requests.map((item) => axios.delete(item))).then((data) => data);
    }
	
    
    removeCaseParticipant(c) {
	let formField = new FormData();
	const url = `${API_URL}/api/case/thread/participant/${c}/`;
	return axios.delete(url).then(response=> response.data);
    }
    
    createThreadParticipants(thread, participants, role) {
	let formField = new FormData();
	const url = `${API_URL}/api/case/thread/${thread}/participants/`;
	for (var i = 0; i < participants.length; i++) {
	    formField.append('names[]', participants[i]);
	}
	formField.append('role', role);
	console.log(formField);
	return axios.post(url, formField).then(response=> response.data);
    }
    createCaseParticipants(c, participants, role) {
	let formField = new FormData();
	const url = `${API_URL}/api/case/${c.case}/participants/`;
	for (var i = 0; i < participants.length; i++) {
	    formField.append('names[]', participants[i]);
	}
    	formField.append('role', role);
	console.log(formField);
	return axios.post(url, formField).then(response=> response.data);
    }

    notifyCaseParticipants(c, data) {
	console.log(data);
	const url = `${API_URL}/case/${c.case}/participants/notify/`;
	return axios.post(url, data).then(response=> response.data);
    }

    notifyAllParticipants(c, data) {
	console.log(data);
	const url = `${API_URL}/case/${c.case}/participants/notify/all/`;
        return axios.post(url, data).then(response=> response.data);
    }
    
    searchPosts(c, search) {
	console.log(search);
	const url = `${API_URL}/api/case/thread/${c.id}/posts/?search=${search}`;
	return axios.get(url).then(response=>response.data);
    }

    searchCases(search) {
	console.log(search);
        const url = `${API_URL}/api/cases/?${search}`;
        return axios.get(url).then(response=>response.data);
    }

    getCases() {
        const url = `${API_URL}/api/cases/`;
	return axios.get(url).then(response => response.data);
    }
    
    getCase(c) {
	const url = `${API_URL}/api/cases/${c.case}/`;
        console.log("in getcases by url");
        return axios.get(url).then(response => response.data);
    }

    getCasesByPage(page) {
	const url = `${API_URL}/api/cases/?page=${page}`;
        return axios.get(url).then(response => response.data);
    }


    searchAll(search, cancel) {
        const url = `${API_URL}/api/search/?${search}`;
        return axios.get(url, {cancelToken: cancel.token})
    }
    
    getMyCases(search=null) {
	let url = `${API_URL}/api/cases/?owned=True&status=0&status=1`;
	if (search) {
	    url = `${API_URL}/api/cases/?owned=True&status=0&status=1&${search}`;
	}
	return axios.get(url).then(response => response.data);
    }

    getMyCasesByPage(page) {
        console.log("in here")
	const url = `${API_URL}/api/cases/?owned=True&status=0&status=1&page=${page}`;
	return axios.get(url).then(response => response.data);
    }
    
    
    updateCase(c, data) {
	console.log(c);
	const url = `${API_URL}/api/cases/${c.case_id}/`;
        console.log("in update cases by url");
        return axios.patch(url, data).then(response => response.data);
    }
    
    getUnassignedCases(search=null) {
	let url = `${API_URL}/api/triage/`;
	if (search) {
            url = `${API_URL}/api/triage/?${search}`;
	}
        return axios.get(url).then(response=>response.data);
    }

    getUnassignedCasesByPage(page) {
	const url = `${API_URL}/api/triage/?page=${page}`;
	console.log("in getcases by url");
        return axios.get(url).then(response => response.data);
    }

    getVul(c) {
	console.log(c);
        const url = `${API_URL}/api/vul/${c.id}/`;
        return axios.get(url).then(response => response.data);
    }
    
    getVuls(c) {
	console.log(c);
	const url = `${API_URL}/api/case/${c.case_id}/vuls/`;
        console.log("in get vuls");
        return axios.get(url).then(response => response.data);
    }

    deleteVulnerability(c) {
	const url = `${API_URL}/api/vul/${c}`;
        return axios.delete(url);
    }    
    
    addVul(c, data) {
	console.log("Add vul")
        const url = `${API_URL}/api/case/${c.case_id}/vuls/`;
	return axios.post(url, data);
    }

    updateVul(vul, data) {
    	console.log("Edit vul")
        const url = `${API_URL}/api/vul/${vul.id}/`;
	return axios.patch(url, data);
    }

    getCWEs() {
	const url = `${API_URL}/api/cwe/`;
	return axios.get(url).then(response=>response.data);
    }

    addArtifact(c, data) {
	console.log("Add file")
        const url = `${API_URL}/api/case/${c.case_id}/artifacts/`;
        return axios.post(url, data, {
	    headers: {
		'Content-Type': 'multipart/form-data'
	    }}).then(response => response.data);
    }

    getArtifacts(c) {
	const url = `${API_URL}/api/case/${c.case_id}/artifacts/`;
        return axios.get(url).then(response => response.data);
    }

    shareCaseArtifact(c) {
	let data = {'share': true};
	const url = `${API_URL}/api/case/artifact/${c.uuid}/`;
        return axios.patch(url, data);
    }

    removeArtifact(c) {
	const url = `${API_URL}/api/case/artifact/${c}/`;
        return axios.delete(url).then(response => response.data);
    }

    addPostImage(data, thread) {
	console.log(data);
	const url = `${API_URL}/api/case/thread/${thread.id}/upload/`;
	return axios.post(url, data, {
            headers: {
	        'Content-Type': 'multipart/form-data'
            }});
    }

    getCVSSForm(vul) {
	const url = `${API_URL}/case/vul/${vul.id}/cvss/`;
        return axios.get(url).then(response => response.data);
    }

    addCVSSScore(vul, data) {
	console.log("HERE IN ADDCVSS");
	const url = `${API_URL}/api/case/vul/${vul.id}/cvss/`;
        return axios.post(url, data).then(response => response.data);
    }

    updateCVSSScore(vul, data) {
	const url = `${API_URL}/api/case/vul/${vul.id}/cvss/`;
	return axios.patch(url, data).then(response => response.data);
    }

    removeCVSSScore(vul) {
	const url = `${API_URL}/api/case/vul/${vul.id}/cvss/`;
        return axios.delete(url).then(response => response.data);
    }

    addSSVCDecision(vul, data) {
	console.log("HERE IN ADDSSVC");
	const url = `${API_URL}/api/case/vul/${vul.id}/ssvc/`;
        return axios.post(url, data).then(response => response.data);
    }

    removeSSVCDecision(vul) {
	const url = `${API_URL}/api/case/vul/${vul.id}/ssvc/`;
        return axios.delete(url).then(response => response.data);
    }

    updateSSVCDecision(vul, data) {
        const url = `${API_URL}/api/case/vul/${vul.id}/ssvc/`;
        return axios.patch(url, data).then(response => response.data);
    }

    getCurrentAdvisory(c) {
	const url = `${API_URL}/api/case/${c.case}/advisory/latest/`;
        return axios.get(url).then(response => response.data);	
    }

    getAdvisoryRevisions(c) {
	const url = `${API_URL}/api/case/${c.case}/advisory/`;
        return axios.get(url).then(response => response.data);	
    }

    saveAdvisory(c, data) {
	const url = `${API_URL}/api/case/${c.case}/advisory/`;
        return axios.post(url, data).then(response => response.data);
    }

    shareAdvisory(c) {
	const url = `${API_URL}/api/case/${c}/advisory/latest/`;
	const data = {'share': true}
        return axios.patch(url, data);
    }

    
}
