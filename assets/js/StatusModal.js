import React from 'react';
import { Accordion, Modal, Table, Tabs, Alert, Badge, Button, Form, Tab } from "react-bootstrap";
import { useState, useEffect } from 'react';
import ComponentAPI from './ComponentAPI.js'
import { format, formatDistance } from 'date-fns'

const componentapi = new ComponentAPI();

const StatusModal = ({showModal, hideModal, component, status}) => {

    const [error, setError] = useState(null);
    const [revisions, setRevisions] = useState([]);
    const [formContent, setFormContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("detail");
    const [vex, setVex] = useState("");

    const fetchActivity = async () => {
	console.log("fetching component status");
	try {
            await componentapi.getComponentStatusActivity(status.id).then((response) => {
		console.log(response);
                setRevisions(response);
            })
        } catch (err) {
            console.log('Error:', err)
        }
    }

    const createVexStatement = () => {
	const build_vex = {};
	const stmts = [];
	console.log(component);
	console.log(status);
	build_vex['@context'] =  "https://openvex.dev/ns"
	build_vex['@id'] = window.location.href;
	build_vex['author'] = status.user;
	build_vex['role'] = "Document Creator";
	build_vex['timestamp'] = status.modified;
	build_vex['version'] = status.revision_number;
	let comps = `${component.component.name} ${component.component.version}`;

	if (component.affected_vuls.length > 0) {
	    stmts.push(component.affected_vuls.map((v, index) => {
		return {"vulnerability": v.vul.vul,
			"products": [comps],
			"status": "affected"}
	    }));
	}
	if (component.fixed_vuls.length > 0) {
	    stmts.push(component.fixed_vuls.map((v, index) => {
		return {"vulnerability": v.vul.vul,
			"products":	[comps],
			"status": "fixed"}
	    }))
	}
	if (component.investigating_vuls.length > 0 ) {

	    stmts.push(component.investigating_vuls.map((v, index) => {
		return {"vulnerability": v.vul.vul,
			"products": [comps],
			"status": "under_investigation"}
            }))
	}
	if (component.unaffected_vuls.length > 0) {
	    stmts.push(component.unaffected_vuls.map((v, index) => {
		return {"vulnerability": v.vul.vul,
			"products": [comps],
			"status": "not_affected",
			"justification": status.justification}
            }))
	}
	build_vex['statements'] = stmts;
	setVex(build_vex);
	setLoading(false);
    }

    const setActiveTabNow = (props) => {
	if (props == "activity") {
	    fetchActivity();
	} else if (props == "vex") {
	    createVexStatement();
	}
        setActiveTab(props);
    }

    return (

	<Modal show={showModal} onHide={hideModal} size="lg" centered backdrop="static">
            <Modal.Header closeButton className="border-bottom">
                <Modal.Title>Component Status Detail</Modal.Title>
            </Modal.Header>
            <Modal.Body>
		{error ?
                 <div className="alert alert-danger">{error}</div>
                 : ""}

		<Tabs
                    defaultActiveKey={"detail"}
                    activeKey = {activeTab}
		    id="status-detail-tabs"
                    onSelect={setActiveTabNow}
                >
                    <Tab eventKey="detail" title="Detail">
			{component && status &&
			 <>
			 <Table>
			     <tbody>
			    <tr>
				<td>Component</td>
				<td>{component.component.name}</td>
			    </tr>

			    <tr>
				<td>Version</td>
				<td>{status.version}{status.version_range}{status.version_end_range}</td>
			    </tr>
				 <tr>
				     <td>Supplier</td>
				     <td>{component.owner && `${component.owner.name}`}</td>
				 </tr>
				 <tr>
				     <td>Vulnerability</td>
				     <td>{status.vul.vul}: {status.vul.description}</td>
				 </tr>
				 <tr>
				     <td>Status</td>
				     <td>{status.status}</td>
				 </tr>
				 {status.status == "Not Affected" &&
				  <tr>
				      <td>Justification</td>
				      <td>{status.justification}</td>
				  </tr>
				 }
				 <tr>
				     <td>Statement</td>
				     <td>{status.statement}</td>
				 </tr>

				 </tbody>
			 </Table>
			 {component.component.products.length > 0 &&
			  <>
			      <b>This component is contained in {component.component.products.length} other components: </b>
			      <ul>
				  {component.component.products.map((c, index) => {
				      return (
					  <li>{c.name}</li>
				      )
				  })}
			      </ul>
			  </>
			 }
			 </>
			}
		    </Tab>
		    <Tab eventKey="activity" title="Activity">
			<Accordion>
			    {revisions.map((rev, index) => {
				let created = new Date(rev.created);
				let num_changes = Object.keys(rev.diff).length;
				return (
				    <Accordion.Item eventKey={index} key={`rev-${rev.revision_number}`}>
					<Accordion.Header>
					    <div>
						<i className="fas fa-plus"></i>
						<span className="px-2">#{rev.revision_number} {format(created, 'yyyy-MM-dd')} by {rev.user} <b>{num_changes} changes</b></span>
					    </div>
					</Accordion.Header>
					<Accordion.Body>
					    {Object.entries(rev.diff)
					     .map( ([key, value]) => {
						 if (key == "stmt_diff") {
						     if(value.length > 0) {
							 return (
							 <Table>
							     <tbody>
								 {
								     value.map((post, index) => {
									 let firstchar = post.charAt();
									 let cn = "equal";
									 switch(firstchar) {
									 case "-":
									     cn = "delete";
									     break;
									 case "+":
									     cn="insert";
									     break;
									 case "?":
									     cn="skip";
									 default:
									     break;

									 }
								if (cn != "skip") {
								    return (
									<tr className={cn} key={index}>
									    <td><div dangerouslySetInnerHTML={{__html: post}} /></td>
									</tr>
								    )
								}
								     })
								 }
							     </tbody>
							 </Table>
							 )
						     }
						 } else {
						     return (
							 <p>{value}</p>
						     )
						 }
					     })
					    }
					</Accordion.Body>
				    </Accordion.Item>
				)
			    })}
			</Accordion>
		    </Tab>

		    <Tab eventKey="vex" title="Vex">
			{loading ?
			 <div className="text-center">
			     <div className="lds-spinner"><div></div><div></div><div></div></div>
			 </div>
			 :
			 <>
			     <pre>
				 {JSON.stringify(vex, null, 2)}
			     </pre>
			     <div className="text-end">
				 <Button variant="outline-primary" href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(vex, null, 2))}`} download={`vex_${component.component.name.replace(/ /g, "_")}.json`}><i className="fas fa-download"></i> Download</Button>
			     </div>
			 </>
			}
		    </Tab>
		</Tabs>
	    </Modal.Body>
	</Modal>
    )

};

export default StatusModal;
