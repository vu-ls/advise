import axios from 'axios';
const API_URL = process.env.API_URL || 'http://localhost:8000/advise';

axios.defaults.xsrfHeaderName = "X-CSRFToken"
axios.defaults.xsrfCookieName = 'csrftoken'

export default class MessageAPI{

    constructor(){}

    getThreads() {
        const url = `${API_URL}/api/inbox/`
        return axios.get(url).then(response => response.data);
    }

    getGroupThreads(group) {
	const url = `${API_URL}/api/inbox/?group=${group}`
        return axios.get(url).then(response => response.data);
    }

    getGroupThreadsByPage(group, page) {
        const url = `${API_URL}/api/inbox/?group=${group}&page=${page}`;
        return axios.get(url).then(response => response.data);
    }
    
    getThreadsByPage(page) {
        const url = `${API_URL}/api/inbox/?page=${page}`;
        return axios.get(url).then(response => response.data);
    }
    
    getUnreadMessageCount() {
	const url = `${API_URL}/api/inbox/unread/`;
	return axios.get(url).then(response=>response.data);
    }
    
    getMessages(thread) {
	const url = `${API_URL}/api/inbox/thread/${thread.id}/`
        return axios.get(url).then(response => response.data);
    }

    createThread(data) {
	const url = `${API_URL}/api/inbox/`
        return axios.post(url, data);
    }

    addImage(data, thread=null) {
	console.log(data);
	let url = `${API_URL}/api/inbox/upload/`
	if (thread) {
            url = `${API_URL}/api/inbox/thread/${thread.id}/upload/`;
	}
	
        return axios.post(url, data, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }});
    }
    
	
    
    createMessage(thread, data) {
	const url = `${API_URL}/api/inbox/thread/${thread.id}/`
        return axios.post(url, data).then(response => response.data);
    }

    searchThreads(search) {
	console.log(search);
        const url = `${API_URL}/api/inbox/?${search}`;
        return axios.get(url).then(response=>response.data);
    }
}
