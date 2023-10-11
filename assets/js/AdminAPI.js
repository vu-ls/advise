import axios from 'axios';
const API_URL = process.env.API_URL || 'http://localhost:8000/advise';

axios.defaults.xsrfHeaderName = "X-CSRFToken"
axios.defaults.xsrfCookieName = 'csrftoken'


export default class AdminAPI{

    constructor(){}

    getPendingUsers() {
	const url = `${API_URL}/api/manage/users/pending/`;
        return axios.get(url).then(response => response.data);
    }

    approvePendingUser(user) {
	let  data = {'pending': false};
	const url = `${API_URL}/api/manage/users/pending/${user.id}/`;
        return axios.patch(url, data).then(response => response.data);
    }

    getResolutionOptions() {
	const url = `${API_URL}/api/manage/case/options/resolutions/`;
        return axios.get(url).then(response => response.data);
    }

    addResolutionOption(data) {
	const url = `${API_URL}/api/manage/case/options/resolutions/`;
	return axios.post(url, data).then(response => response.data);
    }

    deleteResolutionOption(c) {
	const url = `${API_URL}/api/manage/case/options/resolution/${c}/`;
	return axios.delete(url).then(response => response.data);
    }
    
    getNewUsers() {
	const url = `${API_URL}/api/manage/users/new/`;
        return axios.get(url).then(response => response.data);
    }
    
    getAssignments() {
        const url = `${API_URL}/api/manage/autoassignment/`;
        return axios.get(url).then(response => response.data);
    }

    addAssignment(role, data) {
	const url = `${API_URL}/api/manage/autoassignment/${role}/`;
	return axios.patch(url, data).then(response => response.data);
    }

    removeAssignment(role, data) {
	const url = `${API_URL}/api/manage/autoassignment/${role}/`;
	return axios.patch(url, data).then(response => response.data);
    }

    addRole(data) {
	const url = `${API_URL}/api/manage/autoassignment/`;
	return axios.post(url, data).then(response => response.data);
    }

    removeRole(c) {
    	const url = `${API_URL}/api/manage/autoassignment/${c}/`;
	return axios.delete(url).then(response => response.data);
    }

    deleteCVEAccount(c) {
	const url = `${API_URL}/api/manage/cve/account/${c}/`;
        return axios.delete(url).then(response => response.data);
    }
    
    getCVEAccounts() {
	const url = `${API_URL}/api/manage/cve/account/`;
	return axios.get(url).then(response => response.data);
    }

    getCVEAPIOptions() {
	const url = `${API_URL}/api/manage/cve/account/`;
        return axios.options(url).then(response => response.data);
    }
    

    getActiveCVEAccounts() {
	const url = `${API_URL}/api/manage/cve/account/?active=true`;
	return axios.get(url)
    }
   

    getCVEAccount(c) {
	const url = `${API_URL}/api/manage/cve/account/${c}/`;
	return axios.get(url).then(response => response.data);
    }

    updateCVEAccount(c, data) {
	const url = `${API_URL}/api/manage/cve/account/${c}/`;
        return axios.patch(url, data).then(response => response.data).catch(function(error) {
	    console.log(error.response.data);
	});
    }

    getCaseEmailTemplates() {
	const url = `${API_URL}/api/manage/email/templates/?template_type=0`;
	return axios.get(url).then(response => response.data);
    }

    getNotifyEmailTemplates() {
	const url = `${API_URL}/api/manage/email/templates/?template_type=0&search=notify`;
	return axios.get(url).then(response => response.data);
    }

    getConnections() {
	const url = `${API_URL}/api/manage/connections/`;
        return axios.get(url).then(response => response.data);
    }

    getAllConnections() {
	const url = `${API_URL}/api/manage/connections/?all=1`;
        return axios.get(url).then(response => response.data);
    }

    addConnection(data) {
        const url = `${API_URL}/api/manage/connections/`;
	return axios.post(url, data).then(response => response.data);
    }

    updateConnection(c, data) {
	const url = `${API_URL}/api/manage/connection/${c}/`;
        return axios.patch(url, data).then(response => response.data);
    }

    deleteConnection(c) {
	const url = `${API_URL}/api/manage/connection/${c}/`;
	return axios.delete(url).then(response => response.data);
    }

    transferReport(d, key, form) {
	const url = `${d}/advise/api/transfers/report/`;
	console.log(url);
	console.log(key);
	return axios.post(url, form, {
	    headers: {                                                                                               
                'content-type': 'application/json',                                                                   
                'Authorization': `Token ${key}`,
	    }}).then(response=>response.data);
    }

    transferThread(c, d, key, form) {
	const url = `${d}/advise/api/transfers/case/${c}/thread/`;
	let posts = [];
	for (let i=0; i < form.length; i++) {
	    let replies = [];
	    if (form[i]['replies']) {
		let reply_arr = form[i]['replies'];
		console.log(`reply_arr ${reply_arr}`);
		for (let r=0; r<reply_arr.length; r++) {
		    if (reply_arr[r]["group"]) {
			replies.push({'content': reply_arr[r]['content'], 'author': `${reply_arr[r]["author_role"]} from group ${reply_arr[r]["group"]["name"]}`, 'created': reply_arr[r]['created']})
		    } else {
			replies.push({'content': reply_arr[r]['content'], 'author': `${reply_arr[r]["author_role"]}`, 'created': reply_arr[r]['created']})
		    }
		}
	    }
	    let author = `${form[i]["author_role"]}`
	    if (form[i].group) {
		author = `${author} from group ${form[i].group.name}`;
	    }
		
	    posts.push({'content': form[i]['content'], 'author': author, 'created': form[i]['created'], 'replies': replies})
	}
	let data = {'posts': posts};
	return axios.post(url, data, {
	    headers: {
		'content-type': 'application/json',
		'Authorization': `Token ${key}`,
	    }}).then(response=>response.data);
    }
		    

    transferVuls(c, d, key, form) {
	const url = `${d}/advise/api/transfers/case/${c}/vuls/`;
        console.log(url);
        console.log(key);
        return axios.post(url, form, {
            headers: {
		'content-type': 'application/json',
                'Authorization': `Token ${key}`,
            }}).then(response=>response.data);
    }

    transferAdvisory(c, d, key, form) {
	const url = `${d}/advise/api/transfers/case/${c}/advisory/`;
        return axios.post(url, form, {
            headers: {
                'content-type': 'application/json',
                'Authorization': `Token ${key}`,
            }}).then(response=>response.data);
    }
    
    async transferArtifact(c, d, key, filename, mime_type, get_url) {

	/* first get url */
	const {data: blob} = await axios.get(get_url, {responseType: 'arraybuffer'});
	const url = `${d}/advise/api/transfers/case/${c}/artifacts/`;
	console.log(url);
	console.log(key);
	//console.log(data.length);
	let formData = new FormData();
	let file = new File([blob], filename);
	//let file = new Blob([blob]);
	console.log(file.size);
	formData.append('file', file, filename);
	return axios.post(url, formData, {
	    headers: {
		'content-type': 'multipart/form-data',
		'Authorization': `Token ${key}`,
	    }}).then(response=>response.data);
    }

    transferAllArtifacts(array) {
	return axios.all(array);
    }


    async transferVexStatus(c, d, key, vul) {

	/* first get vex */
	let get_url = `${API_URL}/api/vul/${vul.id}/vex/`;
	const data = await axios.get(get_url);
	console.log(data);
	console.log(data.data);
	const url = `${d}/advise/api/transfers/case/${c}/status/`;
	let formData = {'vex': data.data}
	//formData.append('vex', JSON.stringify(data.data))
	return axios.post(url, formData, {
	    headers: {
		'content-type': 'application/json',
                'Authorization': `Token ${key}`,
            }}).then(response=>response.data);
    }
	
    
    transferAllStatus(array) {
	return axios.all(array);
    }
    
    transferCase(form) {
	const url = `${API_URL}/api/case/transfers/`;
	return axios.post(url, form).then(response=>response.data);
    }

    getTransfers(c, page) {
	const url = `${API_URL}/api/case/${c}/transfers/?page=${page}`;
        return axios.get(url).then(response=>response.data);
    }


    getVulsToScore(page) {
	let url = `${API_URL}/score/api/vuls/`;
	if (page) {
	    url = page;
	}
	return axios.get(url).then(response=>response.data);
    }

    queryVuls(query) {
	let url = `${API_URL}/score/api/vuls/?${query}`;
        return axios.get(url).then(response=>response.data);
    }
    
    scoreVul(cve, form) {
	const url = `${API_URL}/score/api/vuls/${cve}/score/`;
	return axios.patch(url, form).then(response=>response.data);
    }

    getVulScore(cve) {
        const url = `${API_URL}/score/api/vuls/${cve}/score/`;
	return axios.get(url).then(response=>response.data);
    }

    getVul(cve) {
	let url = `${API_URL}/score/api/vuls/${cve}/`;
        return axios.get(url).then(response=>response.data);
    }
    
    removeScore(cve) {
	const url = `${API_URL}/score/api/vuls/${cve}/score/`;
	return axios.delete(url).then(response => response.data);
    }

    loadOlderVuls() {
	const url = `${API_URL}/score/api/vuls/load/`;
	return axios.get(url).then(response => response.data);
    }

    lockVulToScore(cve) {
	const data = {'lock': '1'}
	const url = `${API_URL}/score/api/vuls/${cve}/`;
        return axios.patch(url, data).then(response=>response.data);
    }

    unlockVul(cve) {
	const data = {'unlock': '1'}
        const url = `${API_URL}/score/api/vuls/${cve}/`;
	return axios.patch(url, data).then(response=>response.data);
    }

    createCaseFromVul(cve) {
	const data = {'something': 'something'}
        const url = `${API_URL}/score/api/vuls/${cve}/`;
	return axios.post(url, data).then(response=>response.data);
    }
    
}
