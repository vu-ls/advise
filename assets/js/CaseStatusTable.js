import React, { useState, useEffect, useMemo } from 'react';
import CaseThreadAPI from './ThreadAPI';
import { format, formatDistance } from 'date-fns'
import {Alert, Table, Badge, Card, Row, Col, Dropdown, DropdownButton, Button, Form, InputGroup} from 'react-bootstrap';
import DeleteConfirmation from "./DeleteConfirmation";
import { useTable, useSortBy, useRowSelect } from 'react-table';
import {useParams, useNavigate, Link, useLocation} from "react-router-dom"
import CVETable from './CVETable';
import ComponentAPI from './ComponentAPI';
import DisplayVulStatus from './DisplayVulStatus';
import EditStatusModal from './EditStatusModal';
import StatusModal from './StatusModal';

import '../css/casethread.css';

const threadapi = new CaseThreadAPI();
const componentapi = new ComponentAPI();


const Searchbar = ({ onChange, value }) => {
  return (
      <InputGroup className="w-100">
          <Form.Control
              placeholder="Search Components"
              aria-label="Search Components"
              aria-describedby="searchcomponents"
              value={value}
              onChange={onChange}
          />
          <Button variant="btn btn-outline-secondary" id="button-addon2" type="submit">
              <i className="fas fa-search"></i>
          </Button>
      </InputGroup>
  );
};


const CaseStatusTable = () => {

    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [searchVal, setSearchVal] = useState("");
    const [crumbs, setCrumbs] = useState(location.state?.breadcrumbs);
    const [crumbLink, setCrumbLink] = useState(location.state?.crumb_link);
    const [caseInfo, setCaseInfo] = useState(location.state?.caseInfo);
    const [preFilter, setPreFilter] = useState([]);
    const [caseComponents, setCaseComponents] = useState(null);
    const [showEditStatusModal, setShowEditStatusModal] = useState(false);
    const [editStatus, setEditStatus] = useState(null);
    const [component, setComponent] = useState(null);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [displayConfirmationModal, setDisplayConfirmationModal] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState(null);
    const [removeID, setRemoveID] = useState(null);

    const columns = useMemo(
        () => [
            {
		Header: 'Component',
		accessor: 'component.name',
		Cell: props => (
		    <span {...props.row.getToggleRowExpandedProps()}>
			<Button variant="btn-icon px-1">
			    {props.row.isExpanded?
			     <i className="fas fa-caret-down"></i>
			     :
			     <i className="fas fa-caret-right"></i>
			    }
			</Button> {props.row.original.component.name}
		    </span>
		)

            },
            {
		Header: 'Version',
		accessor: 'component.version'
            },
            {
		Header: 'Owner',
		accessor: 'component.owner.name'
            },
	    {
		Header: 'Vulnerability',
		accessor: 'vul.vul.vul'
	    },
	    {
		Header: 'Status',
		accessor: 'vul.status',
		Cell: props => (
		    <DisplayVulStatus
			status={props.row.original.vul.status}
		    />
		)

	    },
	    {
		Header:'Action',
		accessor: 'action',
		Cell: props => (
			<ActionColumn
			    component = {props.row.original.component}
			    vul = {props.row.original.vul}
			    user= {props.row.original.user}
			/>
		)
	    },
	]
    );

    function editStatusNow(c, v) {
	setEditStatus(v);
	setComponent(c);
	setShowEditStatusModal(true);
    }

    function viewStatusDetails(c, v) {
        setEditStatus(v);
        setComponent({'component': c});
        setShowStatusModal(true);
    }

    const hideConfirmationModal = () => {
        setDisplayConfirmationModal(false);
    }

    function removeStatus(id) {
        console.log("remove", id);
        setRemoveID(id);
        setDeleteMessage("Are you sure you want to remove this status?");
        setDisplayConfirmationModal(true);
    };

    const submitRemoveStatus = (id) => {
        componentapi.removeStatus(id).then((response) => {
            getSelectedComponents();
        }).catch(err => {
            setErrorMessage(`Error removing component status: ${err.message}. Are you the case owner?`);
            setDisplayErrorModal(true);
            console.log(err);
        });
        setDisplayConfirmationModal(false);
    }

    const filterData = (value) => {
        if (value === "") {
            /* get full data set back */
	    setCaseComponents(preFilter);
        } else {
	    console.log(value);
	    console.log(preFilter);
	    const result = preFilter.filter((item) => {
		return (
		    item.component.name.toString()
			.toLowerCase()
			.indexOf(value.toLowerCase()) > -1
			||
			item.vul.vul.vul.toString()
			.toLowerCase().
			indexOf(value.toLowerCase()) > -1
			||
			item.vul.status.toString()
			.toLowerCase().
			indexOf(value.toLowerCase()) > -1
			||
			item.component.owner.toString()
			.toLowerCase()
			.indexOf(value.toLowerCase()) > -1
		)
            });
	    setCaseComponents(result);
	}
    }


    // Searchbar functionality
    const onSearchbarChange = (e) => {
        const value = e.target.value
        setSearchVal(value);
        filterData(value);
    }

    const ActionColumn = (props) => {
        const {component, vul, user} = props;

	return (
	    <>
                <Button variant="btn-icon px-1 edit-status-btn" onClick={(e)=>editStatusNow(component, vul)}>
                    <i className="fas fa-edit"></i>
                </Button>
                <Button variant="btn-icon px-1 view-status-btn" onClick={(e)=>viewStatusDetails(component, vul)}>
                    <i className="fas fa-search-plus"></i>
                </Button>
                <Button variant="btn-icon px-1 rm-status-btn" onClick={(e)=>removeStatus(vul.id)}>
                    <i className="fas fa-trash"></i>
                </Button>

            </>

	)
    }

    const hideEditStatusModal = () => {
        setShowEditStatusModal(false);
	getSelectedComponents();
    }

    const hideStatusModal = () => {
	setShowStatusModal(false);
    }

    const getSelectedComponents = async () => {
        console.log("fetching case components");
	await componentapi.getComponentStatus(caseInfo).then((response) => {
            console.log("COMP STATUS", response);
	    const data = [];
	    response.map((r, index) => {
		r.affected_vuls.map((a, y) => {
		    data.push({'component': r.component, 'vul': a})
		})
		r.unaffected_vuls.map((a, y) => {
		    data.push({'component': r.component, 'vul': a})
		})
		r.fixed_vuls.map((a, y) => {
		    data.push({'component': r.component, 'vul': a})
		})
		r.investigating_vuls.map((a, y) => {
		    data.push({'component': r.component, 'vul': a})
		})
	    });
	    setCaseComponents(data);
	    setPreFilter(data);
        }).catch(err => {
            console.log('Error:', err)
            if (err.response.status == 403 || err.response.status==404) {
                navigate("../err");
            }

            setError(`Error retrieving component status: ${err.message}`);
	})
    }

       // Async Fetch
    const fetchInitialData = async () => {
	if (caseInfo == null) {
            await threadapi.getCase({'case': id}).then((response) => {
		console.log(response);
		setCaseInfo(response);
	    }).catch(err => {
		console.log('Error:', err)
		if (err.response.status == 403 || err.response.status==404) {
                    navigate("../err");
		}
		
		setError(`Error retrieving component status: ${err.message}`);

	    });
	} else {
	    getSelectedComponents();
	}
    }


    function SubRows({ row, rowProps, visibleColumns }) {
        return (
            <>
                <tr key={`${rowProps.key}-expanded`}>
		    <td colSpan={visibleColumns.length} className="noborder">
			{row.original.vul.statement ?
			 <><b>Statement:</b> {row.original.vul.statement}<br/></>
			 :
			 <><b>No statement added</b><br/></>
			}
			{row.original.vul.status == "Not Affected" &&
			 <><b>Justification:</b> {row.original.vul.justification}<br/></>
			}
			<b>Status provided by:</b> {row.original.vul.user}<br/>


		    </td>
		</tr>
            </>
        );
    }



    // Create a function that will render our row sub components
    const showDetails = React.useCallback(
        ({ row, rowProps, visibleColumns }) => (
            <SubRows
                row={row}
		rowProps={rowProps}
                visibleColumns={visibleColumns}
            />
        ),
        []
    );

    useEffect(() => {
	if (caseInfo) {
	    getSelectedComponents();
	}
    }, [caseInfo]);

    useEffect(() => {
        fetchInitialData();
    }, []);


    return (
	<>
	    {caseInfo ?
	     <>
		 {crumbs ?

		  <h4 className="fw-bold py-3 mb-4"><span className="text-muted fw-light">{crumbs[0]} /</span> <Link to={crumbLink} >{crumbs[1]}</Link> / <Link to={'..'}>{caseInfo.case_identifier} {caseInfo.title}</Link> / Status</h4>
                      :
                  <h4 className="fw-bold py-3 mb-4"><span className="text-muted fw-light">Cases /</span> <Link to={'..'}>{caseInfo.case_identifier} {caseInfo.title}</Link> / Status</h4>
                 }

		 <Card>
		     <Card.Header>
			 <Searchbar
                             onChange={onSearchbarChange}
                             value={searchVal}
			 />

		     </Card.Header>

		     <Card.Body>
			 {caseComponents ?
			  <CVETable
                              columns = {columns}
                              data = {caseComponents}
                              update = {fetchInitialData}
                              hasMore = {false}
                              showRowExpansion={showDetails}
                              cveAPI = {threadapi}
                          />
			  :
			  <div className="text-center">
			      <div className="lds-spinner"><div></div><div></div><div></div></div>
			  </div>
			 }
		     </Card.Body>
		 </Card>
		 <EditStatusModal
		     showModal = {showEditStatusModal}
		     hideModal = {hideEditStatusModal}
		     component = {component}
		     compstatus = {editStatus}
		 />
		 <StatusModal
                     showModal = {showStatusModal}
                     hideModal = {hideStatusModal}
                     comp = {component}
                     status = {editStatus}

		 />
		 <DeleteConfirmation
                     showModal={displayConfirmationModal}
                     confirmModal={submitRemoveStatus}
                     hideModal={hideConfirmationModal}
		     id={removeID}
                     message={deleteMessage} />
             </>
	     :
	     <></>
	    }
	</>
    )
}

export default CaseStatusTable;
