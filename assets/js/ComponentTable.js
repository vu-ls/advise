import React, { useState, useEffect, useMemo } from 'react';
import ComponentAPI from './ComponentAPI';
import {Row, Alert, Card, Col, Button, Form, Dropdown, InputGroup, DropdownButton} from 'react-bootstrap';
import ResizableTable from "./ResizableTable";
import '../css/casethread.css';
import AddComponentModal from './AddComponentModal';
import DeleteConfirmation from "./DeleteConfirmation";
import UploadFileModal from './UploadFileModal';
import ComponentDetailModal from "./ComponentDetailModal";
import SelectGroupModal from "./SelectGroupModal";
import axios from 'axios';
import {Link, useLocation} from "react-router-dom"


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

    const location = useLocation();
    const [data, setData] = useState([]);
    const [error, setError] = useState(null);
    const [count, setCount] = useState(0);
    const [nextUrl, setNextUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);
    const [searchVal, setSearchVal] = useState("");
    const [addComponentModal, setAddComponentModal] = useState(false);
    const [editComponent, setEditComponent] = useState(null);
    const [cloneComponent, setCloneComponent] = useState(null);
    const [displayConfirmationModal, setDisplayConfirmationModal] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState(null);
    const [removeID, setRemoveID] = useState([]);
    const [product, setProduct] = useState(null);
    const [btnDisabled, setBtnDisabled] = useState("disabled");
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [componentDetail, setComponentDetail] = useState(null);
    const [group, setGroup] = useState(null);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const skipPageResetRef = React.useRef()
    
    
    const hideUploadModal = () => {
        setShowUploadModal(false);
    };

    function submitFile(data) {
        console.log("IN SUBMIT!!!");
        console.log(data);
	setIsLoading(true);
        componentapi.loadSPDX(data, props.group).then((response) => {
	    fetchInitialData(searchVal);
        }).catch(err => {
	    console.log(err);
	    setError({'msg': `Error uploading SBOM file: ${err.response.data.error}`, 'variant': danger});
	    setIsLoading(false);
	});

        hideUploadModal();
    }


    const columns = useMemo(
        () => [
            /*{
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
		),
		width: 50,
		disableSizing: true,
	    },*/
	    {
		Header: 'name',
		accessor: 'name',
		Cell: props => (
		    <Link to={`/advise/components/${props.row.original.id}`} state={{component: props.row.original, search: props.search}}>{props.row.original.name}</Link>
		)
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
		    <>

			{props.row.original.dependencies.length > 0 ?
			 <span {...props.row.getToggleRowExpandedProps()}>
			     {props.row.isExpanded ?
			      <Button variant="secondary" size="xs"><i className="fas fa-angle-down"></i>  Hide</Button> : <Button variant='secondary' size="xs"><i className="fas fa-angle-right"></i>  Show {props.row.original.dependencies.length}  </Button>}
			 </span>
			 :
			 <>
			     0{" "}<Button variant="btn-icon px-1" title="Add Dependencies" onClick={() => addDeps(props.row)}><i className="fas fa-plus"></i></Button>
			 </>
			}
		    </>
		),
	    },
	    {
		Header: 'Action',
		accessor: 'action',
		Cell: props => (<div className="text-nowrap"><Button variant="btn-icon px-1" onClick={() => handleShow(props)}><i className="fas fa-edit"></i></Button> <Button variant="btn-icon px-1" onClick={() => viewDetails(props)}><i className="fas fa-search-plus"></i></Button><Button variant="btn-icon px-1" title="Clone Component" onClick={()=>handleCloneComponent(props)}><i className="fas fa-clone"></i></Button></div>)
	    }
        ],
        []
    );

    const addDeps = (row) => {
	setProduct(row.original);
	window.scrollTo(0, 0)
    };

    const handleCloneComponent = (props) => {
	setCloneComponent(props.row.original.id);
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
            setDeleteMessage(<div>Are you sure you want to remove the following components: <ul>{rmnames.map((item, index)=><li key={`rm-${item}`}>{item}</li>)}</ul></div>);
        } else {
            setDeleteMessage("Plase select a component to remove.");
        }
        setDisplayConfirmationModal(true);
    };


    const submitRemoveComponent = () => {
        componentapi.removeComponents(removeID).then((response) => {
	    setError({'msg':`Got it! ${removeID.length} items successfully removed.`, 'variant': 'success'});
            fetchInitialData(searchVal);

        }).catch(err => {
	    setError({'msg': `Error removing components: ${err.response.data.detail}`, 'variant': 'danger'});
	})
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
	if (editComponent || cloneComponent) {
	    setAddComponentModal(true);
	}
    }, [editComponent, cloneComponent]);

    const hideComponentModal = () => {
        setAddComponentModal(false);
	setEditComponent(null);
	setCloneComponent(null);
	fetchInitialData(searchVal);
    };

    const hideGroupModal = () => {
	setShowGroupModal(false);
	fetchInitialData(searchVal);
    };

    const filterData = (value) => {
        if (value === "") {
	    /* get full data set back */
	    fetchInitialData(value);
        } else {
	    setNextUrl(null);
	    value = encodeURIComponent(value);
	    let query = `search=${value}`;
	    /* stash full data set in filtered data */
	    if (props.group) {
		componentapi.getGroupComponents(props.group, query).then((response) => {
		    if (response.results) {
			setData(response.results);
		    }
		    setCount(response.count);
                    setNextUrl(response.next);
                }).catch(err => {
		    setError({'msg':`Error filtering components: ${err.response.data.detail}`, 'variant': 'danger'});
		});
	    } else {
		componentapi.getComponents(query).then((response) => {
		    console.log(response);
		    if (response.results) {
			setData(response.results);
		    }
		    setCount(response.count);
                    setNextUrl(response.next);

		}).catch(err => {
		    setError({'msg': `Error filtering components: ${err.response.data.detail}`, 'variant': 'danger'}) ;
		})
	    }
	    /*
            const result = data.filter((item) => {
                return (
                    item.name.toString()
                        .toLowerCase()
                        .indexOf(value.toLowerCase()) > -1
			||
			(item.owner && item.owner.name.toString()
			.toLowerCase()
			 .indexOf(value.toLowerCase()) > -1)
                );
            });
	    console.log("FILTERING....", result)
            setFilteredData(result)*/
        }
    }

    function handleManage(evt, evtKey) {
        switch(evt) {
        case 'add' :
            setAddComponentModal(true);
            return;
        case 'remove':
            showDeleteModal();
            return;
        case 'owner':
	    setShowGroupModal(true);
            return;
	case 'upload':
	    setShowUploadModal(true);
	    return;

        }
    };

    // Searchbar functionality
    const onSearchbarChange = (e) => {
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

    const submitDependencies = async () =>{
	const axiosArray = []

	setError(null);

	selectedRows.map(item => {
	    let data = {'dependency': item.original.id}
	    axiosArray.push(componentapi.addOneDependency(product.id, data));
	});

	try {
	    await axios.all(axiosArray);
	    setProduct(null)
	    setSelectedRows([]);
	    setSearchVal(null);
	    fetchInitialData(searchVal);
	    setError({'msg': `Successfully added ${selectedRows.length} dependencies`, 'variant': 'success'});
	} catch(err) {
	    setError({'msg': `Error adding dependency: ${err.response.data.detail}`, 'variant': 'danger'});
	};
    }

    // Async Fetch
    const fetchInitialData = async (searchParam) => {
        console.log("fetching components");

        try {
	    if ('group' in props) {
		await componentapi.getGroupComponents(props.group).then((response) => {
		    console.log(response);
		    if (response.results) {
			setData(response.results);
		    }
		    setCount(response.count);
		    setNextUrl(response.next);
                    setIsLoading(false);
		    if (searchParam) {
			filterData(searchParam);
		    }

		})
	    } else {
		await componentapi.getComponents().then((response) => {
		    console.log(response);
		    if (response.results) {
			setData(response.results);
		    }
		    setCount(response.count);
		    setNextUrl(response.next);
                    setIsLoading(false);
		    if (searchParam) {
            		filterData(searchParam);
                    }
		})
	    }
        } catch (err) {
	    if (err.response?.data) {
		setError({'msg': `Error retrieving components: ${err.response.data.detail}`, 'variant': 'danger'});
	    } else {
		setError({'msg': "Error retrieving components.", 'variant': 'danger'});
	    }
            console.log('Error:', err)
        }
    }

    const fetchNextData = async () => {
	
	skipPageResetRef.current = true
	
	try {
            if ('group' in props) {
	        await componentapi.getNextGroupComponents(nextUrl).then((response) => {
                    console.log(response);
                    setData(data.concat(response.results));
		    setCount(response.count);
		    setNextUrl(response.next);
                    setIsLoading(false);
                })
            } else {
                await componentapi.getNextComponents(nextUrl).then((response) => {
		    console.log(response);
                    setData(data.concat(response.results));
                    setCount(response.count);
                    setNextUrl(response.next);
	            setIsLoading(false);
                })
            }
        } catch (err) {
	    setError({'msg': `Error retrieving components: ${err.response.data.detail}`, 'variant': 'danger'});
	    console.log('Error:', err)
        }
    }


    useEffect(() => {

	if ('group' in props) {
	    setGroup(props.group);
	}
	if (location.state) {
	    setSearchVal(location.state.search);
	    fetchInitialData(location.state.search);
	} else {
	    fetchInitialData("");
	}

    }, []);

    const fetchMoreData = () => {
	console.log("loading more...");
	if (nextUrl) {
	    fetchNextData();
	}
	setTimeout(() => {

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
			<tr key={`${rowProps.key}-expanded-${i}`} className="text-center">
			    <td colSpan={visibleColumns.length} className="text-center noborder">
				{x}
			    </td>
			</tr>
		    );



		})}
		<tr key={`${rowProps.key}-expanded-addmore`} className="text-center border-bottom">
                    <td colSpan={visibleColumns.length} className="text-center noborder">
			<Button variant="primary" size="xs" className="p-1" title="Add Dependencies" onClick={() => addDeps(row)}><i className="fas fa-plus"></i> Add Dependencies</Button>
                    </td>
                </tr>
	    </>
	);
    }

    useEffect(() => {
	// After the table has updated, always remove the flag
	skipPageResetRef.current = false
    }, [data])

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
	<>
	    {props.group ? ""
	     :
	     <h4 className="fw-bold py-3 mb-4"><span className="text-muted fw-light">Components /</span> Component List</h4>
	    }
	    <Card>
            <Card.Header>
		{product ?

		 <Alert variant="warning">
		     <div className="d-flex align-items-start gap-4">
		     <Card.Title>Adding dependencies for <b>{product.name}</b></Card.Title>
			 <Button variant="secondary" onClick={(e)=>setProduct(null)}>Cancel</Button>
		     </div>
		 </Alert>

		 : ""
		}
		{selectedRows.length > 0 &&
		 <Alert variant="info">{selectedRows.length} rows selected</Alert>
		}
		  
                <div className="d-flex align-items-start justify-content-between mt-2 gap-5">
                    <Searchbar
			onChange={onSearchbarChange}
			value={searchVal}
		    />

		    {product ?
		     <Button variant="primary" onClick={(e)=>submitDependencies()} disabled={btnDisabled}>Submit Dependencies</Button>
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
			<Dropdown.Item eventKey="upload">Upload SBOM (SPDX)</Dropdown.Item>
			{props.group ? "" :
			 <Dropdown.Item eventKey="owner">Add Component Owner</Dropdown.Item>
			}
                    </DropdownButton>
		    }
                </div>
            </Card.Header>
            <Card.Body>
		{error &&
		 <Alert variant={error.variant}>{error.msg}</Alert>
		}
		{ isLoading ?
		  <div className="text-center">
                      <div className="lds-spinner"><div></div><div></div><div></div></div>
                  </div>
		  :
		  <ResizableTable columns={columns}
				  data= {data}
				  setSelectedRows = {handleSelectedRows}
				  update={fetchMoreData}
				  showRowExpansion={showDeps}
				  hasMore={nextUrl ? true : false}
				  searchParams = {searchVal}
				  skipPageResetRef = {skipPageResetRef}
		  />
		}
	    </Card.Body>

	    <AddComponentModal
		showModal = {addComponentModal}
		hideModal = {hideComponentModal}
		title = {editComponent? "Edit Component" : "Add Component"}
		edit = {editComponent}
		group = {props.group}
		clone = {cloneComponent}
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
	    <UploadFileModal
		showModal = {showUploadModal}
                hideModal = {hideUploadModal}
                confirmModal = {submitFile}
		title = "Upload SBOM file (SPDX format) to load components."
		subtitle="All packages and package dependencies will be uploaded."
            />
	    {props.group ? "" :
	     <SelectGroupModal
		 showModal = {showGroupModal}
		 hideModal = {hideGroupModal}
		 selected= {selectedRows}
	     />
	    }

	    </Card>
	</>
    )
};

export default ComponentTable;
