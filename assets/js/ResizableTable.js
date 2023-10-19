import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import BTable from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import { useTable, useExpanded, useSortBy, useRowSelect } from 'react-table';
import InfiniteScroll from "react-infinite-scroll-component";


const Styles = styled.div`
  padding: 1rem;

   .noborder {
     border-bottom: 0;
   }

  .tableWrap {
    display: block;
    max-width: 100%;
    overflow-x: scroll;
    overflow-y: hidden;
  }

   table {
    border-spacing: 0;
    width: 100%;
   }

    tr {
      :last-child {
        td {
          border-bottom: 0;
        }
      }
    }


    th,
    td {
      margin: 0;
      padding: 0.5rem;
      ${'' /* In this example we use an absolutely position resizer,
       so this is required. */}
      position: relative;
      overflow-wrap: break-word;
      overflow-x: hidden;
      white-space: normal !important;
      max-width: 150px;

      :last-child {
        border-right: 0;
      }
      &:hover {
        .resizer {
            display: inline-block;
        }
      }
      .resizer {
        display: none;
        background: #697a8d;
        width: 6px;
        height: 100%;
        position: absolute;
        right: 0;
        top: 0;
        transform: translateX(50%);
        z-index: 1;
        ${'' /* prevents from scrolling while dragging on touch devices */}
        touch-action:none;

        &.isResizing {
          background: red;
        }
      }
    }
`

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

const ResizableTable = ({columns, data, setSelectedRows, update, showRowExpansion, hasMore, searchParams}) => {

    const defaultColumn = React.useMemo(
    () => ({
      minWidth: 30,
      width: 150,
      maxWidth: 400,
    }),
    []
  )

    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow,
        selectedFlatRows,
	visibleColumns,
	allColumns,
	getToggleHideAllColumnsProps,
        state: {selectedRowIds}
    } = useTable(
        {
            columns,
            data,
	    defaultColumn,
        },
        useSortBy,
	useExpanded,
	useRowSelect,
	hooks => {
      hooks.allColumns.push(columns => [
          // Let's make a column for selection
          {
              id: 'selection',
              disableResizing: true,
              minWidth: 35,
              width: 35,
              maxWidth: 35,
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
              ),
          },
          ...columns,
      ])
	    hooks.useInstanceBeforeDimensions.push(({ headerGroups }) => {
		// fix the parent group of the selection button to not be resizable
		const selectionGroupHeader = headerGroups[0].headers[0]
		selectionGroupHeader.canResize = false
	    })
	}
    )


    useEffect(()=>{
        if (selectedFlatRows) {
            setSelectedRows(selectedFlatRows);
        }
    },[
        setSelectedRows,
        selectedRowIds
    ]);


    return (
	<Styles>
	    <>
		<div className="d-flex">
		    <div className="cb action" key="column-all">
			<label>
                            <input type="checkbox" {...getToggleHideAllColumnsProps()} />{" "}
                            <span>Toggle All</span>
                        </label>
		    </div>
		    {/* Loop through columns data to create checkbox */}
		    {allColumns.map((column) => (
			<React.Fragment key={`checkbox-${column.id}`}> 
			{column.canResize &&
			<div className="cb action" key={column.id}>
			    <label>
				<input type="checkbox" {...column.getToggleHiddenProps()} />{" "}
				<span>{column.Header}</span>
			    </label>
			</div>
			}
			</React.Fragment>
		    ))}
		    <br />
		</div>
	    </>
	    <div className="tableWrap">
	    <InfiniteScroll
		dataLength={rows.length}
		next={update}
		hasMore={hasMore}
		loader={<h5 className="mt-3">Loading more...</h5>}
	    >
		<BTable className="table" hover {...getTableProps()}>
		    <thead>
			{headerGroups.map(headerGroup => (
                    <tr {...headerGroup.getHeaderGroupProps()}>
                        {headerGroup.headers.map(column => (

			    <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                                {column.render('Header')}
                                {/* Add a sort direction indicator  */}
                                <span>
                                     {column.isSorted
                                     ? column.isSortedDesc
                                     ? ' 🔽'
                                     : ' 🔼'
                                     : ''}
                                </span>
				{/* {column.canResize && (
				    <div
					{...column.getResizerProps()}
					className={`resizer ${
                                         column.isResizing ? 'isResizing' : ''
                                        }`}
					onClick={(e)=>{e.preventDefault(); e.stopPropagation()}}
				    />
				    )} */}
                            </th>
			))}
                    </tr>
                ))}
            </thead>
            <tbody>
		{/* {...getTableBodyProps()} */}

                {(rows.length > 0 && rows.map((row, i) => {
                    prepareRow(row);
		    const rowProps = row.getRowProps();
                    return (
			<React.Fragment key={i}>
                            <tr  {...row.getRowProps()}>
                            {row.cells.map(cell => {
                                return (
                                    <td
                                        {...cell.getCellProps()}>{cell.render('Cell', {search: searchParams})}</td>
                                )
                            })}
                        </tr>
			{row.isExpanded ? (
			    showRowExpansion({ row, rowProps, visibleColumns })
			) : null}
			</React.Fragment>
		    )
                })) || <tr><td colSpan={visibleColumns.length} className="text-center">No data ...</td></tr>}
            </tbody>
            </BTable>
	    </InfiniteScroll>
	</div>
	    </Styles>
    )
}

export default ResizableTable;
