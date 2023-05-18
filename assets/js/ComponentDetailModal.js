import React from 'react';
import { Modal, Table, Tab, Button, Tabs } from "react-bootstrap";
import { useState, useEffect } from 'react';
import '../css/casethread.css';
import ComponentAPI from './ComponentAPI';
import DisplayVulStatus from './DisplayVulStatus';

const componentapi = new ComponentAPI();

const ComponentDetailModal = ({showModal, hideModal, id}) => {

    const [loading, setLoading] = useState(true);
    const [cases, setCases] = useState([]);
    const [activeTab, setActiveTab] = useState("detail");


    // Async Fetch
    const fetchCases = async () => {
	await componentapi.getComponentCases(id).then((response) => {
            console.log(response);
	    setCases(response);
            setLoading(false);
        }).catch (err => {
	    console.log(err);
	});
    }

    const setActiveTabNow = (props) => {
        if (props == "cases") {
	    fetchCases();
	}
	setActiveTab(props);
    }

    if (id) {
	return (
	    <Modal show={showModal} onHide={hideModal} size="lg" centered>
		<Modal.Header closeButton className="border-bottom">
                    <Modal.Title>Component Detail {id.name}</Modal.Title>
		</Modal.Header>
		<Modal.Body id="component-modal">
		    <Tabs
                        defaultActiveKey={"detail"}
			activeKey = {activeTab}
			id="component-detail-tabs"
			onSelect={setActiveTabNow}
                    >
			<Tab eventKey="detail" title="Detail">
			    <div>
				{
			    Object.entries(id)
				.map( ([key, value]) => {
				    if (value) {
				    return (
					<div className="mt-2" key={`${key}-comp}`}><label className="form-label">{key}:</label>
					    { Array.isArray(value) ?
					      <><br/><ul>
						  {value.map((v, index) => {
						      if (typeof v === "object") {
							  return (
							      <li key={`${v.name}-${index}`}>{v.name}</li>
							  )
						      } else {
							  return (
							      <li key={`${v}-${index}`}>{v}</li>
							  )
						      }
						  })
						  }
					      </ul></>
					      :
					      <>
						  {typeof value === "object" ?
						   <span className="m-2"><b>{value.name}</b></span>
						   :
						   <span className="m-2"><b>{value}</b></span>
						  }
					      </>
					    }
					</div>
				    )}})

			}
			    </div>
			</Tab>
			<Tab eventKey="cases" title="Cases">
			    {loading ?
			     <div className="text-center"><div className="lds-spinner"><div></div><div></div><div></div></div></div>
			     :
			     <Table>
                                 <thead>
                                     <tr>
					 <th>
					     Case
					 </th>
                                         <th>
                                             Vul
                                         </th>
                                         <th>
                                             Status
                                         </th>
				     </tr>
				 </thead>
				 <tbody>
				     {cases.map((c, index) => {
					 return (
					     <tr key={`case-component-${c.id}`}>
						 <td><a href={`${c.vul.url}`}>{c.vul.case}</a></td>
                                                 <td>{c.vul.vul}</td>
                                                 <td><DisplayVulStatus
                                                         status={c.status}
                                                     />
                                                 </td>
					     </tr>
					 )
				     })
				     }
				 </tbody>
			     </Table>
			    }
			</Tab>
		    </Tabs>
		</Modal.Body>
	    </Modal>
	)
    }


};

export default ComponentDetailModal;
