import React, { useState, useEffect, useMemo } from 'react';
import ComponentAPI from './ComponentAPI';
import {Row, Card, Col, Button, Form, Dropdown, InputGroup, DropdownButton} from 'react-bootstrap';
import GenericTable from "./GenericTable";
import '../css/casethread.css';
import AddComponentModal from './AddComponentModal';
import DeleteConfirmation from "./DeleteConfirmation";
import ComponentDetailModal from "./ComponentDetailModal";
import SelectGroupModal from "./SelectGroupModal";

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


const ComponentTable = (props) => {

    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);
    const [searchVal, setSearchVal] = useState(null);
    const [addComponentModal, setAddComponentModal] = useState(false);
    const [editComponent, setEditComponent] = useState(null);
    const [displayConfirmationModal, setDisplayConfirmationModal] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState(null);
    const [removeID, setRemoveID] = useState([]);
    const [product, setProduct] = useState(null);
    const [btnDisabled, setBtnDisabled] = useState("disabled");
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [componentDetail, setComponentDetail] = useState(null);
    const [group, setGroup] = useState(null);
    const [showGroupModal, setShowGroupModal] = useState(false);

    const columns = useMemo(
        () => [
            {
		id: "selection",
		// The header can use the table's getToggleAllRowsSelectedProps method
		// to render a checkbox
		Header: ({ getToggleAllRowsSelectedProps }) => (
                    <div>
			<input type="checkbox" {...getToggleAllRowsSelectedProps()} />
                    </div>
		),
		// The cell can use the individual row's getToggleRowSelectedProps method
		// to the render a checkbox
		Cell: ({ row }) => (
                    <div>
			<input type="checkbox" {...row.getToggleRowSelectedProps()} />
                    </div>
		)
	    },
	    {
		Header: 'name',
		accessor: 'name'
	    },
            {
		Header: 'version',
		accessor: 'version'
            },
	    {
		Header: 'owner',
		accessor: 'owner.name',
		Cell: props => (
		    <a href={`${props.row.original.owner.url}`}>{props.row.original.owner.name}</a>
		)

	    },
	    {
		Header: 'type',
		accessor: 'component_type',
	    },
	    {
		Header: 'supplier',
		accessor: 'supplier'
	    },
	    {
		Header: 'source',
		accessor: 'source'
	    },
	    {
		Header: 'comment',
		accessor: 'comment'
	    },
	    {
		Header: 'Contained in',
		accessor: 'products',
		Cell: props => (
		    <span>{props.row.original.products.length}</span>
		)
	    },
	    {
		Header: 'Dependencies',
		id: 'expander',
		accessor: 'dependencies',
		Cell: props => (
		    // Use Cell to render an expander for each row.
		    // We can use the getToggleRowExpandedProps prop-getter
		    // to build the expander.
		    <span {...props.row.getToggleRowExpandedProps()}>
			{props.row.original.dependencies.length > 0 ?
			 <>
			     {props.row.isExpanded ?
			      <button className="btn btn-secondary btn-xs"><i className="fas fa-angle-down"></i>  Hide</button> : <button className='btn m-1 btn-xs btn-secondary'><i className="fas fa-angle-right"></i>  Show {props.row.original.dependencies.length}  </button>}
			 </>
			 : 0
			}
		    </span>
		),
	    },
	    {
		Header: 'Action',
		accessor: 'action',
		Cell: props => (<div className="text-nowrap"><Button variant="btn-icon px-1" onClick={() => handleShow(props)}><i className="fas fa-edit"></i></Button> <Button variant="btn-icon px-1" onClick={() => addDeps(props)}><i className="fas fa-plus"></i></Button><Button variant="btn-icon px-1" onClick={() => viewDetails(props)}><i className="fas fa-search-plus"></i></Button></div>)
	    }
        ],
        []
    );

    const addDeps = (props) => {
	setProduct(props.row.original);
    };

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
            setDeleteMessage(`Are you sure you want to remove the following components: ${rmnames}`);
        } else {
            setDeleteMessage("Plase select a component to remove.");
        }
        setDisplayConfirmationModal(true);
    };


    const submitRemoveComponent = () => {
        componentapi.removeComponents(removeID).then((response) => {
            fetchInitialData();
        });
        setDisplayConfirmationModal(false);
    };

    const hideConfirmationModal = () => {
        setDisplayConfirmationModal(false);
    };

    const hideDetailModal = () => {
	setShowDetailModal(false);
    };

    const handleShow = (props) => {
	console.log(props.row.original.id);
	setEditComponent(props.row.original.id);
    };

    const viewDetails = (props) => {
	setComponentDetail(props.row.original);
	setShowDetailModal(true);
	console.log("view details of component");
    };

    useEffect(() => {
	if (editComponent) {
	    setAddComponentModal(true);
	}
    }, [editComponent]);

    const hideComponentModal = () => {
        setAddComponentModal(false);
	setEditComponent(null);
	fetchInitialData();
    };

    const hideGroupModal = () => {
	setShowGroupModal(false);
	fetchInitialData();
    };

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
            console.log("HERE");
            setAddComponentModal(true);
            return;
        case 'remove':
            showDeleteModal();
            return;
        case 'owner':
	    setShowGroupModal(true);
	    console.log("not implemented yet");
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

    function handleSelectedRows(rows) {
	setSelectedRows(rows);
	if (rows.length > 0 && product) {
	    setBtnDisabled("");
	} else {
	    setBtnDisabled("disabled");
	}
    }

    function submitDependencies () {
	let adddeps = [];
	selectedRows.map(item => {
            adddeps.push(item.original.id)
        });
	componentapi.addDependency(product.id, adddeps).then((response) => {
	    setProduct(null);
	    setSelectedRows([]);
	    setSearchVal(null);
	    fetchInitialData();
	});
    }
    // Async Fetch
    const fetchInitialData = async () => {
        console.log("fetching components");

        try {
	    if ('group' in props) {
		await componentapi.getGroupComponents(props.group).then((response) => {
		    console.log(response);
                    setData(response);
                    setIsLoading(false);
		})
	    } else {
		await componentapi.getComponents().then((response) => {
		    console.log(response);
                    setData(response);
                setIsLoading(false);
		})
	    }
        } catch (err) {
            console.log('Error:', err)
        }
    }

    useEffect(() => {
	if ('group' in props) {
	    setGroup(props.group);
	}

	fetchInitialData();
    }, []);

    const fetchMoreData = () => {
	setTimeout(() => {
	    setData();
	}, 1500);
    };

    const DisplayDependencies = (props) => {
	console.log(props);
	return (
	    props.dependencies.map((d, index) => {
		return (
		    <h5>{d}</h5>
		)
	    })
	)
    }

    async function getDependencies(id) {
	const response = await componentapi.getDependencies(id);
	return response.dependencies.map(item => item.name)
    }

    function SubRows({ row, rowProps, visibleColumns, data, loading }) {
	if (loading) {
	    return (
		<tr>
		    <td colSpan={visibleColumns.length}>
			<b>Loading...</b>
		    </td>
		</tr>

	    );
	}

	// error handling here :)
	//
	return (
	    <>
		{data.map((x, i) => {
		    return (
			<tr {...rowProps} key={`${rowProps.key}-expanded-${i}`} className="text-center">
			    <td colSpan={visibleColumns.length}>
				{x}
			    </td>
			</tr>
		    );



		})}
	    </>
	);
    }



    function SubRowAsync({ row, rowProps, visibleColumns }) {
	const [loading, setLoading] = React.useState(true);
	const [data, setData] = React.useState([]);

	useEffect(() => {
	    const timer = setTimeout(() => {
		componentapi.getDependencies(row.original.id).then((response) => {
		    const d = response.dependencies.map(item => item.name)
		    setData(d);
		    setLoading(false);
		});
	    }, 500);

	    return () => {
		clearTimeout(timer);
	    };
	}, []);

	return (
	    <SubRows
		row={row}
		rowProps={rowProps}
		visibleColumns={visibleColumns}
		data={data}
		loading={loading}
	    />
	);
    }


    // Create a function that will render our row sub components
    const showDeps = React.useCallback(
	({ row, rowProps, visibleColumns }) => (
	    <SubRowAsync
		row={row}
		rowProps={rowProps}
		visibleColumns={visibleColumns}
	    />
	),
	[]
    );

    return (
        <Card>
            <Card.Header>
		{product ?
		 <div className="d-flex align-items-start gap-4">
		     <Card.Title> Add dependencies for {product.name} </Card.Title>
		     <Button variant="secondary" onClick={(e)=>setProduct(null)}>Cancel</Button>
		 </div>
		 : ""
		}
                <div className="d-flex align-items-start justify-content-between mt-2 gap-5">
                    <Searchbar onChange={onSearchbarChange} />

		    {product ?
		     <Button variant="primary" onClick={(e)=>submitDependencies()} disabled={btnDisabled}>Add Selected Dependencies</Button>
		     :
                    <DropdownButton
                        variant="primary"
                        title={
                            <span>Manage Components <i className="fas fa-chevron-down"></i>
                            </span>
                        }
			onSelect={handleManage}
                    >

			<Dropdown.Item eventKey="add">Add Component</Dropdown.Item>
                        <Dropdown.Item eventKey="remove">Remove Component</Dropdown.Item>
			{props.group ? "" :
			 <Dropdown.Item eventKey="owner">Add Component Owner</Dropdown.Item>
			}
                    </DropdownButton>
		    }
                </div>
            </Card.Header>
            <Card.Body>
		{ isLoading ?
		  <div className="text-center">
                      <div className="lds-spinner"><div></div><div></div><div></div></div>
                  </div>
		  :
		  <div className="flex justify-center mt-8">
		      <GenericTable columns={columns}
				    data= {filteredData.length > 0 ? filteredData : data}
				    setSelectedRows = {handleSelectedRows}
				    update={fetchMoreData}
				    showRowExpansion={showDeps}
		      />

		  </div>
		}
	    </Card.Body>

	    <AddComponentModal
		showModal = {addComponentModal}
		hideModal = {hideComponentModal}
		title = {editComponent? "Edit Component" : "Add Component"}
		edit = {editComponent}
		group = {props.group}
	    />

	    <DeleteConfirmation
                showModal={displayConfirmationModal}
		confirmModal={submitRemoveComponent}
                hideModal={hideConfirmationModal}
                id={removeID}
                message={deleteMessage} />
	    <ComponentDetailModal
		showModal = {showDetailModal}
		hideModal = {hideDetailModal}
		id = {componentDetail}
	    />
	    {props.group ? "" :
	     <SelectGroupModal
		 showModal = {showGroupModal}
		 hideModal = {hideGroupModal}
		 selected= {selectedRows}
	     />
	    }

	</Card>
    )
};

export default ComponentTable;
