
import React from 'react';
import ReactDOM from "react-dom";
import CaseThreadAPI from './ThreadAPI';
import { useState, useEffect, useCallback } from 'react';
import PostDisplay from './PostDisplay';
import Editor from "./Editor";
import DeleteConfirmation from "./DeleteConfirmation";
import DiffModal from "./DiffModal";
import Button from 'react-bootstrap/Button';

const threadapi = new CaseThreadAPI();

function createMarkup(posts) {
    return {__html: posts.postsHTML};
}

export default function PostList(props) {
    const [requser, setReqUser] = useState(null);
    const [thread, setThread] = useState(null);
    const [nextUrl, setNextUrl] = useState("");
    const [previousUrl, setPreviousUrl] = useState("");
    const [posts, setPosts] = useState([]);
    const [totalPosts, setTotalPosts] = useState(0);
    const [showTotal, setShowTotal] = useState(0);
    const [showMore, setShowMore] = useState(0);
    const [pinnedPosts, setPinnedPosts] = useState([]);
    //const [postsHTML, setPostsHTML] = useState("");
    //<div dangerouslySetInnerHTML={createMarkup({postsHTML})} />
    const [id, setId] = useState(null);
    const [diffId, setDiffId] = useState(null);
    const [displayConfirmationModal, setDisplayConfirmationModal] = useState(false);
    const [displayDiffModal, setDisplayDiffModal] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState(null);
    const [replyPost, setReplyPost] = useState(null);
    const [isLoading, setIsLoading] = useState(true)
    const [isPinnedLoading, setIsPinnedLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [toggle, setToggle] = useState("fifo");

    const showDeleteModal = (id) => {
        setId(id);
        setDeleteMessage("Are you sure you want to delete this post?");
        setDisplayConfirmationModal(true);
    };

    const setReplyToPost = (post) => {
	console.log("REPLY POST");
	console.log(post);
	setReplyPost(post);
    };


    const hideConfirmationModal = () => {
        setDisplayConfirmationModal(false);
    };

    const hideDiffModal = () => {
	setDisplayDiffModal(false);
    };

    const showDiffModal = (id) => {
	console.log("IN SHOW DIFFMODAL");
	console.log(id);
	setDiffId(id);
	setDisplayDiffModal(true);
    }

    const submitDeletePost = (id) => {
	console.log("IN DELETE POST");
	console.log(id);
	threadapi.deletePost(id).then((response) => {
	    updatePosts();
	});
        setDisplayConfirmationModal(false);
    };

    const paginationHandler = (url) => {
	setIsLoading(true);
	threadapi.getPostsByURL(url).then((response) => {
            setNextUrl(response.next);
            setPreviousUrl(response.previous);
	    if (response.results) {
		if (toggle == "lifo") {
		    let newposts = response.results.reverse();
		    setPosts(posts => [...posts, ...newposts]);
		} else {
		    setPosts(posts => [...response.results, ...posts]);
		}
	    }
	    setIsLoading(false);

        })
    }

    const getPinnedPosts=()=> {
	threadapi.getPinnedPosts(thread).then((response) => {
	    console.log(response);
	    if (response.results) {
		setPinnedPosts(response.results);
		console.log("in set pinned posts");
	    }
	    setIsPinnedLoading(false);
	})
    }

    useEffect(() => {
	setReqUser(props.user);
	setThread(props.thread);
    }, [props]);

    useEffect(() => {
	updatePosts();
    }, [thread]);

    useEffect(() => {
	if (search) {
	    console.log("IN SEARCH");
	    console.log(search);
	    setIsLoading(true);
	    setNextUrl("");
	    setPreviousUrl("");
	    setPinnedPosts([])
            setPosts([])
            threadapi.searchPosts(thread, encodeURIComponent(props.search.value)).then((response) => {
		console.log(response);
		if (response.results) {
                    if (toggle == "fifo") {
			setPosts(response.results.reverse());
                    }
                    else {
			setPosts(response.results);
                    }
		    setTotalPosts(response.count);
		} else {
		    setPosts([]);
		    setTotalPosts(0);
		}
                setIsLoading(false);
            });
	} else {
	    updatePosts();
	}
    }, [search])


    const getAllPosts=() => {
	setIsLoading(true);
	//props.update();
        threadapi.getPosts(thread).then((response) => {
	    setNextUrl(response.next);
	    setPreviousUrl(response.previous);
	    if (response.results) {

		if (toggle == "fifo") {
		    setPosts(response.results.reverse());
		} else {
		    setPosts(response.results);
		}
		console.log("POSTS", response.results);
		setTotalPosts(response.count);
	    }
	    setIsLoading(false);
	    setReplyPost(null);

	});
    }
    const updatePosts=() => {
	if (thread) {
	    setIsLoading(true);
	    setIsPinnedLoading(true);
	    getPinnedPosts();
	    getAllPosts();
	}
    }

    useEffect(() => {
	let total = pinnedPosts.length + posts.length;
	setShowTotal(total);
	let more = totalPosts - posts.length;
	if (more >= 0) {
	    setShowMore(more);
	} else {
	    setShowMore(0);
	}
    }, [posts, pinnedPosts]);

    useEffect(() => {
	console.log("Searching for: ", props.search);
	if (props.search) {
	    setSearch(props.search.value);
	    if (props.search.toggle != toggle) {
		setToggle(props.search.toggle);
		let reversePosts = posts.reverse();
		setPosts(reversePosts);
		let revPin = pinnedPosts.reverse();
		setPinnedPosts(revPin);
	    }
	    /*} else {
		updatePosts();
	    }*/
	} else {
	    updatePosts();
	}
    }, [props.search]);


    return (
	<div>
	    <div id="pinnedposts">
		{isPinnedLoading ?
		 <div className="text-center">
                     <div className="lds-spinner"><div></div><div></div><div></div></div>
                 </div>
		 :
		 <>
		     {pinnedPosts.length > 0 && (
			 <PostDisplay
			     posts = {pinnedPosts}
			     user = {requser}
			     dataUpdated = {updatePosts}
			     deletePost = {showDeleteModal}
			     replyToPost = {setReplyToPost}
			     viewPostDiff = {showDiffModal}
			     participants = {props.participants}
			 />
		     )}
		 </>
		}
	    </div>
	    {(nextUrl && (toggle == "fifo")) && (
		<div className="d-grid gap-2 mb-2">
		    <Button
			size="lg"
			variant="secondary"
			onClick={()=>paginationHandler(nextUrl)}
		    >
			View {showMore} Older Posts...
		    </Button>
		</div>
	    )}

	    <div id="allposts">
		{isLoading ? (
		    <div className="text-center">
                        <div className="lds-spinner"><div></div><div></div><div></div></div>
                    </div>
		) : (
		<PostDisplay
		    posts = {posts}
		    user = {requser}
		    dataUpdated = {updatePosts}
		    deletePost = {showDeleteModal}
		    replyToPost = {setReplyToPost}
		    search = {search}
		    viewPostDiff = {showDiffModal}
		    participants = {props.participants}
		/>
		)}
	    </div>

	    {(nextUrl && (toggle == "lifo")) && (
                <div className="d-grid gap-2 mb-2">
                    <Button
                        size="lg"
                        variant="secondary"
                        onClick={()=>paginationHandler(nextUrl)}
                    >
                        View {showMore} Older Posts...
                    </Button>
                </div>
	    )}
	    {thread && thread.archived ?
	     ""
	     :
	     <Editor
                 thread = {thread}
		 dataUpdated = {getAllPosts}
		 reply = {replyPost}
		 participants = {props.participants}
             />
	    }
	    
	    <DeleteConfirmation
		showModal={displayConfirmationModal}
		confirmModal={submitDeletePost}
		hideModal={hideConfirmationModal}
		id={id}
		message={deleteMessage} />
	    <DiffModal
		showModal={displayDiffModal}
		hideModal={hideDiffModal}
		id={diffId}

	    />

	</div>

    )



}
