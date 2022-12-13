import React, { useState, useEffect } from 'react'
import {Card, Badge, Alert, DropdownButton, Dropdown, InputGroup, FloatingLabel, Form, Container, Row, Col, Tab, Tabs, Nav, Button} from 'react-bootstrap';
import CaseThreadAPI from './ThreadAPI';
import '../css/casethread.css';
import {format, formatDistance} from 'date-fns';
import StatusAddForm from './StatusAddForm';
import VulAddForm from './VulAddForm';
import ViewReport from './ViewReport';

const threadapi = new CaseThreadAPI();

const CaseSummaryApp = (props) => {

    const [caseInfo, setCaseInfo] = useState(null);
    const [caseTitle, setCaseTitle] = useState("");
    const [feedback, setFeedback] = useState(null);
    const [activeTab, setActiveTab] = useState("casedetails");
    const [vuls, setVuls] = useState([]);
    const [owner, setOwner] = useState(false);
    const [statusRequired, setStatusRequired] = useState(false);
    const [statusCheck, setStatusCheck] = useState(false);

    useEffect(() => {
	setCaseInfo(props.caseInfo);
	setVuls(props.vuls);
	if (props.caseInfo.report == null) {
	    setActiveTab("casedetails");
	}
	if ((props.user.role === 'vendor') && (vuls.length > 0)) {
	    /* also need to get status for this vendor */
	    setStatusRequired(true);
	}

    }, [props]);


    useEffect(() => {
        if (vuls) {
            setStatusCheck(vuls.some(item => item.affected_products.length > 0));
            console.log("vuls are updated");
        }
    }, [vuls]);


    return (
	caseInfo ?
	    <div className="nav-align-top mb-4">
		<Tab.Container
                    defaultActiveKey={activeTab}
		    activeKey={activeTab}
                    id="report"
                    className="mb-3"
		    onSelect={(e)=>(setFeedback(null),setActiveTab(e.eventKey))}
                >
                    <Nav variant="pills" className="mb-3" fill justify>
			<Nav.Item>
                            <Nav.Link eventKey="casedetails">Case Details</Nav.Link>
                        </Nav.Item>
			{caseInfo.report &&
			<Nav.Item>
                            <Nav.Link eventKey="report"> Original Report</Nav.Link>
                        </Nav.Item>
			}
			<Nav.Item>
                            <Nav.Link eventKey="vuls"><span className="text-nowrap">Vulnerabilties{" "}
				{vuls.length > 0 &&
				 <Badge pill bg="info">{vuls.length}</Badge>
				}
						      </span>
			    </Nav.Link>
                        </Nav.Item>

			<Nav.Item>
                            <Nav.Link eventKey="status">
				{statusCheck ?
				 <>
                                     <span className="text-nowrap">Status <i className="fas fa-check text-success"></i></span>
                                 </>
                                 :
                                 <>
				     {statusRequired ?
                                      <>Status Required <i class="fas fa-exclamation-triangle link-danger"></i></>
				      :
				     "Status"
				     }
                                 </>
                                }
			    </Nav.Link>
                        </Nav.Item>

		    </Nav>
		    <Tab.Content>
			<Tab.Pane eventKey="casedetails">
			    {feedback &&
			     feedback
			    }
			    <p className="lead"><b>{caseInfo.case_identifier} {caseInfo.title}</b></p>
			    <p>Summary:<br/>
				{caseInfo.summary}
			    </p>
			</Tab.Pane>
			{caseInfo.report &&
			<Tab.Pane eventKey="report">
			     <ViewReport
				 report={caseInfo.report}
			     />
			</Tab.Pane>
			}
			<Tab.Pane eventKey="vuls">
			    <VulAddForm
				caseInfo = {caseInfo}
				vuls = {vuls}
				updateVuls = {null}
			    />
			</Tab.Pane>
			<Tab.Pane eventKey="status">
			    <StatusAddForm
				caseInfo = {caseInfo}
				vuls = {vuls}
				user = {props.user}
			    />
			</Tab.Pane>
		    </Tab.Content>
		</Tab.Container>
	    </div>
	:
	<Card className="p-4 mb-3">
	    <Alert variant="warning">This case is currently pending. We are working on adding details. In the meantime, you can start the discussion below or add related artifacts.</Alert>
	 </Card>
    )
}

export default CaseSummaryApp;
