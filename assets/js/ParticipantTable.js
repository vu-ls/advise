import React, { useState, useEffect, useMemo } from 'react';
import CaseThreadAPI from './ThreadAPI';
import Row from 'react-bootstrap/Row';
import { format, formatDistance } from 'date-fns'
import {Alert, Card, Col, Dropdown, DropdownButton, Button, Form, InputGroup} from 'react-bootstrap';
import DisplayLogo from "./DisplayLogo";
import BTable from "react-bootstrap/Table";
import '../css/casethread.css';
import { useTable, useSortBy, useRowSelect } from 'react-table';
import {useParams, useNavigate, Link, useLocation} from "react-router-dom"
import DropDownCustomEditor from './customDropDownEditor';
import ParticipantModal from './ParticipantModal.js';
import DeleteConfirmation from "./DeleteConfirmation";
import NotifyVendorModal from "./NotifyVendorModal";

const threadapi = new CaseThreadAPI();


const Searchbar = ({ onChange, value }) => {
  return (
      <InputGroup className="w-100">
          <Form.Control
              placeholder="Search Participants"
              aria-label="Search Participants"
              aria-describedby="searchparticipants"
	      value={value}
              onChange={onChange}
          />
          <Button variant="btn btn-outline-secondary" id="button-addon2" type="submit">
              <i className="fas fa-search"></i>
          </Button>
      </InputGroup>
  );
};


function Table({columns, data, setSelectedRows}) {

    const {
	getTableProps,
	getTableBodyProps,
	headerGroups,
	rows,
	prepareRow,
	selectedFlatRows,
	state: {selectedRowIds}
    } = useTable(
	{
	    columns,
	    data,
	},
	useSortBy,
	useRowSelect
    )

    useEffect(()=>{
	if (selectedFlatRows) {
	    setSelectedRows(selectedFlatRows);
	}
    },[
	setSelectedRows,
	selectedRowIds
    ]);
	/*
	console.log(selectedRowPaths);
	console.log(selectedRows);
	setSelectedRows(selectedRowPaths);
	console.log("HERLKJERJ");
    }, [setSelectedRows, selectedRowPaths]);*/

    return (
	<BTable className="table" hover {...getTableProps()}>
	    <thead>
		{headerGroups.map(headerGroup => (
		    <tr {...headerGroup.getHeaderGroupProps()}>
			{headerGroup.headers.map(column => (
			    <th
				{...column.getHeaderProps(column.getSortByToggleProps())}
			    >
				{column.render('Header')}
				{/* Add a sort direction indicator */}
				<span>
				    {column.isSorted
				     ? column.isSortedDesc
				     ? ' 🔽'
				     : ' 🔼'
				     : ''}
				</span>
			    </th>
			))}
		    </tr>
		))}
	    </thead>
	    <tbody
		{...getTableBodyProps()}
	    >
		{rows.map((row, i) => {
		    prepareRow(row);
		    return (
			<tr {...row.getRowProps()}>
			    {row.cells.map(cell => {
				return (
				    <td
					{...cell.getCellProps()}>{cell.render('Cell')}</td>
				)
			    })}
			</tr>
		    )
		})}
	    </tbody>
	</BTable>
    )
}

/*rowProps(row)*/

const ParticipantTable = () => {
    
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();    
    const [caseInfo, setCaseInfo] = useState(location.state?.caseInfo);
    const [reqUser, setReqUser] = useState(location.state?.reqUser);
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filteredData, setFilteredData] = useState([])
    const [searchVal, setSearchVal] = useState(null);
    const [selectedRows, setSelectedRows] = useState([]);
    const [displayParticipantModal, setDisplayParticipantModal] = useState(false);
    const [displayConfirmationModal, setDisplayConfirmationModal] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState(null);
    const [removeID, setRemoveID] = useState([]);
    const [summary, setSummary] = useState(null);
    const [displayVNModal, setDisplayVNModal] = useState(false);
    
    const showDeleteModal = () => {
	/*get selected rows and add them to removeid */
	let rmids = [];
	let rmnames = [];
	selectedRows.map(item => {
	    rmids.push(item.original.id)
	    rmnames.push(item.original.name)
	});
	if (rmnames.length > 0) {
            setRemoveID(rmids);
            setDeleteMessage(`Are you sure you want to remove these participants: ${rmnames.map(item => item).join(', ')}`);
	} else {
	    setDeleteMessage("Please select a participant(s) to remove them from this case.");
	}
        setDisplayConfirmationModal(true);
    };


    const submitRemoveParticipant = async () => {
        setIsLoading(true);
	await threadapi.removeCaseParticipants(removeID).then((response) => {
	    fetchInitialData();
	}).catch(err => {
	    console.log(err);
	    setError(`An error occurred during the participant removal: ${err.message} ${err.response.data.detail}`);
	});
        setDisplayConfirmationModal(false);
    };

    const hideConfirmationModal = () => {
        setDisplayConfirmationModal(false);
    };

    const hideVNModal = () => {
	setDisplayVNModal(false);
    }

    const submitNotifyVendors = async (subject, content) => {
	let formField = new FormData();
	let participants = selectedRows.map(item => item.original.id);

	formField.append('subject', subject);
	formField.append('content', content);

	for (var i = 0; i < participants.length; i++) {
            formField.append('participants[]', participants[i]);
        }

	await threadapi.notifyCaseParticipants({'case': caseInfo.case_id}, formField).then((response) => {
	    fetchInitialData();
	}).catch(err => {
	    console.log(err);
	});
		
	setDisplayVNModal(false);
    }

    const IndeterminateCheckbox = React.forwardRef(
	({ indeterminate, ...rest }, ref) => {
	    const defaultRef = React.useRef()
	    const resolvedRef = ref || defaultRef
	    
	    React.useEffect(() => {
		resolvedRef.current.indeterminate = indeterminate
	    }, [resolvedRef, indeterminate])
	    
	    return (
		<>
		    <input type="checkbox" ref={resolvedRef} {...rest} />
		</>
	    )
	}
    )

    
    const cols = useMemo(
	() => [
	    {
		Header: 'Name',
		Cell: ({
                    value: initialValue,
                    row: row,
                    column: {id}
		}) => {
                    return (
			<div className="d-flex gap-2 align-items-center">
			    <DisplayLogo
				photo = {row.original.photo}
				color = {row.original.logocolor}
				name = {row.original.name}
			    />
			    {row.original.name}
			</div>
		    )
		}
            },
            {
		Header: 'type',
		accessor: 'participant_type',
            },
	    {
		Header: 'role',
		accessor: 'role',
	    }
	]
    )
		    
    const columns = useMemo(
	() => [
	{
        id: "selection",
            // The header can use the table's getToggleAllRowsSelectedProps method
            // to render a checkbox
            Header: ({ getToggleAllRowsSelectedProps }) => (
		<div>
		    <IndeterminateCheckbox {...getToggleAllRowsSelectedProps()} />
		</div>
            ),
            // The cell can use the individual row's getToggleRowSelectedProps method
            // to the render a checkbox
            Cell: ({ row }) => (
		<div>
		    <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
		</div>
            )
	},
	{
	    Header: 'Name',
	    Cell: ({
		value: initialValue,
		row: row,
		column: {id}
	    }) => {
		return (
		    <div className="d-flex gap-2 align-items-center">
			<DisplayLogo
			    photo = {row.original.photo}
			    color = {row.original.logocolor}
			    name = {row.original.name}
			/>
			{row.original.name}
		    </div>
		)
	    }
	},
	    {
	    Header: 'type',
	    accessor: 'participant_type',
	},
	{
	    Header: 'Added by',
	    accessor: 'added_by',
	},
	{
	    Header: 'Added on',
	    accessor: row => {
		let date = new Date(row.added);
		return (
		    <>{format(date, 'yyyy-MM-dd')}</>
		)
	    }
	},
        {
	    Header: 'Notified',
	    accessor: row => {
		if (row.notified) {
		    let date = new Date(row.notified);
		    return (
			<>{format(date, 'yyyy-MM-dd')}
			</>
		    )
		} else {
		    return ""
		}
	    }
	},
	{
	    Header: 'Viewed Case',
	    accessor: 'seen'
	},
	{
	    Header: 'role',
	    accessor: 'role',
	    Cell: ({
		value: initialValue,
		row: row,
		column: { id },
		updateMyData,
	    }) => {
		const onItemClick = value => {
		    updateData(row.original.id, id, value)
		}
		return (
		    <DropDownCustomEditor
			title={"Select Role"}
			options={row.original.roles_available}
			selectedValue={initialValue}
			onItemClick={onItemClick}
		    />
		)
	    },
	}
	],
	[]
    );

    const hideParticipantModal = () => {
        setDisplayParticipantModal(false);

    };
    
    const updateData = (rowIndex, id, value) => {
	setError(null);
        threadapi.editCaseParticipant(rowIndex, value).then((response) => {
            console.log("successfully updated");
	    setData((old) =>
		old.map((row, index) => {
		    if (row.id === rowIndex) {
			return response;
			/*return {
			    ...old[index],
			    [id]: value,
			};*/
		    }
		    return row;
		})
	    );
	}).catch(err => {
	    setError(`Error changing role for this user: ${err.message} ${err.response.data.detail}`);
	    console.log(err);
	})

    }


    useEffect(() => {
	if (searchVal) {
	    filterData(searchVal);
	}
    }, [data]);	


    const filterData = (value) => {
	if (value === "") {
            setFilteredData(data)
        } else {
            const result = data.filter((item) => {
                return (
                    item.name.toString()
                        .toLowerCase()
                        .indexOf(value.toLowerCase()) > -1
                );
            });
            setFilteredData(result)
        }
    }

    function handleManage(evt, evtKey) {
	switch(evt) {
	case 'add' :
	    setDisplayParticipantModal(true);
	    return;
	case 'remove':
	    showDeleteModal();
	    return;
	case 'email':
	    setDisplayVNModal(true);
	    return;
	}
    };
    
    
    // Searchbar functionality
    const onSearchbarChange = e => {
	console.log(selectedRows);
	const value = e.target.value
	setSearchVal(value);
	filterData(value);
    }

    const doSomething = (props) => {
	console.log(props);
	console.log(selectedRows);
    }
	  
    // Async Fetch
    const fetchInitialData = async () => {
	if (caseInfo == null) {
	    await threadapi.getCase({'case': id}).then((response) => {
                setCaseInfo(response);
	    }).catch(err => {
		if (err.response.status == 403 || err.response.status==404) {
                    navigate("../err");
                }
		console.log(err);
	    })
	}
	if (reqUser == null) {
	    await threadapi.getUserCaseState({'case': id}).then((response) => {
                console.log("USER IS ", response);
                setReqUser(response);
            })
	}
	
        await threadapi.getCaseParticipants({'case': id}).then((response) => {
	    console.log(response);
            setData(response);
	    setIsLoading(false);
        }).catch(err => {
	    console.log(err);
	    if (err.response.status == 403) {
                navigate("../err");
            } else {
		setError(`Could not retrieve participant list: ${err.message} ${err.response.data.detail}`);
	    }
	});

	await threadapi.getCaseParticipantSummary({'case': id}).then((response) => {
	    setSummary(response.data);
	    
	}).catch(err=> {
	    setError(`Error loading case participants ${err.message}`);
	});
    }

    useEffect(() => {
	fetchInitialData();
    }, []);

    return (
	caseInfo ?
	    <>
		<h4 className="fw-bold py-3 mb-4"><span className="text-muted fw-light">Cases /</span> <Link to={'..'}>{caseInfo.case_identifier} {caseInfo.title}</Link> / Participants</h4>
		
		<Card>
		    <Card.Header>
			{caseInfo && caseInfo.status === "Active" && summary && summary.notified < summary.count &&
			 <Alert variant="warning">This case has {summary.count-summary.notified} participants that have not been notified.</Alert>
			}
			{caseInfo && caseInfo.status === "Pending" &&
			 <Alert variant="warning">This case is currently in <b>Pending</b> state. Users can not be notified until case state has been changed to <b>Active</b>.</Alert>
			 
			}
			<>
			    {error &&
			     <Alert variant="danger">{error}</Alert>
			    }
			</>
			<div className="d-flex align-items-start justify-content-between mt-2 gap-5">    
			    <Searchbar onChange={onSearchbarChange} />
			    {reqUser && reqUser.role === "owner" &&
			     <DropdownButton
				 variant="primary"
				 title={
				     <span>Manage Participants <i className="fas fa-chevron-down"></i>
				     </span>
				 }
				 onSelect={handleManage}
			     >
				 <Dropdown.Item eventKey="add">Add Participant</Dropdown.Item>
				 <Dropdown.Item eventKey="remove">Remove Participant</Dropdown.Item>
				 {caseInfo.status === "Active" &&
				  <Dropdown.Item eventKey="email">Notify Selected Participants</Dropdown.Item>
				 }
			     </DropdownButton>
			    }
			</div>
		    </Card.Header>
		    <Card.Body>
			{ isLoading ?
			  <div className='text-center'>Loading...</div>
			  :
			  <div className="flex justify-center mt-8">
			      <Table columns={reqUser.role === "owner" ? columns : cols}
				     data= {filteredData.length > 0 ? filteredData : data}
				     setSelectedRows = {setSelectedRows}
			      />
			      {reqUser.role === "owner" &&
			       <p className="mt-4">Selected Rows: {selectedRows.length}</p>
			      }
			  </div>
			}
		    </Card.Body>
		    {reqUser && reqUser.role === "owner" &&
		     <>
			 <ParticipantModal
			     showModal = {displayParticipantModal}
			     hideModal = {hideParticipantModal}
			     caseid = {id}
			     confirmInvite = {fetchInitialData}
			     title = "Invite Participants to Case"
			     allowSelectRole = "True"
			     caseInfo = {caseInfo}
			 />
			 <DeleteConfirmation
			     showModal={displayConfirmationModal}
			     confirmModal={submitRemoveParticipant}
			     hideModal={hideConfirmationModal}
			     id={removeID}
			     message={deleteMessage} />
			 <NotifyVendorModal
			     showModal = {displayVNModal}
			     hideModal = {hideVNModal}
			     confirmModal = {submitNotifyVendors}
			     count={selectedRows.length}
			 />
		     </>
		    }
		</Card>
	    </>
		:
	<div className="text-center">                                                                    
            <div className="lds-spinner"><div></div><div></div><div></div></div>                         
        </div> 

    )
}


export default ParticipantTable;


