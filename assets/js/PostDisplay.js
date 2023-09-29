import React from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Dropdown from 'react-bootstrap/Dropdown';
import {Row, Col} from 'react-bootstrap';
import DropdownButton from 'react-bootstrap/DropdownButton';
import '../css/casethread.css';
import { format, formatDistance } from 'date-fns'
import CaseThreadAPI from './ThreadAPI';
import { useState, useEffect } from 'react';
import Editor from "./Editor";
import DisplayLogo from "./DisplayLogo";

const threadapi = new CaseThreadAPI();


export default function PostDisplay(props) {

    const updateData = props.dataUpdated;
    const deletePost = props.deletePost;
    const replyToPost = props.replyToPost;
    const viewPostDiff = props.viewPostDiff;
    
    const Post = (props) => {
	const [editPost, setEditPost] = useState(false);
	const [post, setPost] = useState(props.post);
	const user = props.user;
	const date = props.date;
	const timeago = props.timeago;

	
	const editThisPost=()=> {
	    console.log("in edit post");
	    console.log(post);
	    setEditPost(true);
	}

	const doneEditPost=()=> {
	    console.log("DONE EDIT POST!");
	    setEditPost(false);
	    console.log(post);
	    threadapi.getPost(post).then((response) => {
		setPost(response);
	    });
	}
	
        let dprops  = {
	    user,
	    post,
	}
	let cols = props.reply ? 11 : 12;
	let cardclass = props.parent ? "has_replies" : "mt-2";
	cardclass = props.lastreply ? `${cardclass}` : `mb-2 ${cardclass}`;
	//cardclass = props.reply ? "replypost" : cardclass;
	//{user.user.photo ? <Image src={user.user.photo} rounded /> : (displayLogo(dprops)) }

	return (
	    <Row>
		
		{props.reply &&
		 <Col lg={1} className="me-0 pe-0">
		     <div className="replyspace h-100"></div>
		 </Col>
		}
		
		<Col lg={cols}>
		    <Card key={`card_${post.id}`} className={`${cardclass} ${post.pinned ? "pinned" :""}`}>
			<Card.Header>
			    <div className="d-flex align-items-start justify-content-between mt-2">
				<div className="author d-flex align-items-start justify-content-between">
			{post.group ?
                         <DisplayLogo
                             name={post.group.name}
                             photo={post.group.photo}
                             color ={post.group.logocolor}
                         />  
			 :
			 
			 <DisplayLogo
			     name={post.author.name}
			     photo={post.author.photo}
			     color ={post.author.logocolor}
			 />
			}
			<div className="author_info px-3">
			    <div className="post_author ml-3">{post.author.name }</div>
			    {post.group &&
			     <div className="post_org">{post.group.name}</div>
			    }
			    <span className="small text-muted">({post.author_role})</span>
			</div>
			{post.pinned && (
			    <div className="post-pinned fw-semibold">
				<i className="fas fa-thumbtack"></i> Pinned Post
			    </div>
			)}
		    </div>
		    <PostDropdown
			user = {user}
			post = {post}
			editPost = {editThisPost}
		    />
		</div>
	    </Card.Header>
	    <Card.Body className="pt-4 contentpost">
		<div className="postcontent">
		    {editPost ?
		     <Editor
			 post = {post}
			 dataUpdated = {doneEditPost}
			 participants = {props.participants}
		     />
		     :
		     <div dangerouslySetInnerHTML={{__html: post.content}} />
		    }
		</div>
	    </Card.Body>
	    <Card.Footer className="d-flex flex-wrap justify-content-between align-items-center px-0 pt-0 pb-3">
		<div className="px-4 pt-3">
		    <div className="post-stats">{format(date, 'yyyy-MM-dd H:mm:ss ')} ({timeago})    		{post.revisions > 0 && (
			<a href='#' onClick={(e)=>(e.preventDefault(), viewPostDiff(post.revision_id))} className="show-diff">{post.revisions} edit{post.revisions > 1 &&"s"}</a>
		    )}
		    </div>
		</div>
		<div className="px-4 pt-3">
		    <div className="d-flex gap-4 text-end reply-button">
			<Button className="reply-to-post btn btn-sm btn-primary" onClick={()=>replyToPost(post)}>Reply</Button>
		    </div>
		</div>
	    </Card.Footer>
	    
	    
	</Card>
		</Col>
	    </Row>
	)
    }

    const PostDropdown = (props) => {

	function handlePostSelect(evt, evtKey) {
	    console.log(evt);
	    switch(evt) {
	    case 'pin':
		threadapi.pinPost(props.post).then((response) => {
		    updateData();
		});
		return;
		
	    case 'delete':
		deletePost(props.post.id);
		return;
	    case 'edit':
		props.editPost(props.post.id);
		return;
		
	    case 'unpin':
                threadapi.unpinPost(props.post).then((response) => {
                    console.log(response);
		    updateData();
                })
		return;
	    default:
		console.log("weird");
	    }
	};

	
	const user = props.user;
	const post = props.post;
	
	const icon = (<i className="bx bx-dots-vertical-rounded"></i>);
	const showedits = (user.contact == post.author.contact);
	const showdelete = (showedits || user.delete_perm);
	const showpin = (user.delete_perm && !post.pinned);
	const showunpin = (user.delete_perm && post.pinned);

	return (
	    <DropdownButton variant="btn p-0 postactions" title={icon} onSelect={handlePostSelect}>
		{showedits && (
		    <Dropdown.Item eventKey="edit">Edit Post</Dropdown.Item>
		)}
		{showdelete && (
		    <Dropdown.Item eventKey='delete'>Delete Post</Dropdown.Item>
		)}
		{showpin && (
		    <Dropdown.Item eventKey='pin'>Pin Post</Dropdown.Item>
		)}
		{showunpin && (
		    <Dropdown.Item eventKey='unpin'>Unpin Post</Dropdown.Item>
		)}
	    </DropdownButton>
	);
    };
    
    const displayLogo = (props) => {
	const {user, post} = props;
	const style = {
	    backgroundColor: user.user.logocolor
	};
	return(
	    <div className="profile-pic rounded-circle text-center flex-shrink-0" style={style}>
	    <span className="logo-initial">{post.author_name[0]}</span></div>
	);
    }

    //{user.user.photo ? (<Image src={user.user.photo} rounded />) : displayLogo(dprops)}
    const displayPosts = (props) => {
        const {user, posts} = props;
	
        if (posts && posts.length > 0) {
            return (
		posts.map((post, index) => {
		    //console.log(format(post.created, 'yyyy/mm/dd'));
		    let date = new Date(post.created);
		    let timeago = formatDistance(date, new Date(), {addSuffix: true});
		    return (
			<div key={`reply-${post.id}`}>
			    {post.replies && post.replies.length > 0 ?
			     <>
				 <div className="replywrap">
				 <Post
				     key={post.id}
				     user={user}
				     post={post}
				     date={date}
				     timeago={timeago}
				     parent={true}
				     participants={props.participants}
				 />
			     </div>
			     <div className="p-2 replygap h-100"></div>
			     <div className="replies">
				 {post.replies.map((reply, index) => {
				     let d = new Date(reply.created);
				     let tgo = formatDistance(d, new Date(), {addSuffix: true});
				     let lastreply = (index == post.replies.length) ? true : false;
				     return (
					 <Post
					     key={reply.id}
					     user={user}
					     post={reply}
					     date={d}
					     timeago={tgo}
					     reply={true}
					     parent={false}
					     lastreply={lastreply}
					     participants={props.participants}
					 />
				     )
				 })}
			     </div>
				 <div className="mb-4"></div>
			     </>
			     :
			     <Post
                                 key={post.id}
                                 user={user}
                                 post={post}
                                 date={date}
                                 timeago={timeago}
				 participants={props.participants}
                             /> 
			    }
			</div>
                    )
		    
		})

            );
	    
        } else if (props.search) {
	    return (
		<p className="text-center"> No posts matched your filter criteria.</p>
	    );
	}
    }
    return (
        <>                                                                               
            {displayPosts(props)}                                                      
        </>
    )
}
