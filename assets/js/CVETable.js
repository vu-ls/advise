import React, { useState, useEffect, useMemo } from 'react';
import BTable from "react-bootstrap/Table";
import {Button, Form, Row, Col} from "react-bootstrap";
import { useTable, useSortBy, useExpanded, usePagination } from 'react-table';
import InfiniteScroll from "react-infinite-scroll-component";

const CVETable = ({columns, data, fetchData, loading, cveAPI, showRowExpansion, pageCount: controlledPageCount}) => {


    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        prepareRow,
	page,
	visibleColumns,
	canPreviousPage,
	canNextPage,
	pageOptions,
	pageCount,
	gotoPage,
	nextPage,
	previousPage,
	setPageSize,
        state: {pageIndex, pageSize},
    } = useTable(
        {
            columns,
            data,
	    initialState: {
		pageIndex: 0,
		pageSize: 50,
		sortBy: [
		    {
			id:'reserved',
			desc: true
		    }
		]
	    },
	    manualPagination: true,
	    pageCount: controlledPageCount,
        },
        useSortBy,
	useExpanded,
	usePagination,
    )

    useEffect(() => {
	fetchData({ pageIndex, pageSize, cveAPI })
    }, [fetchData, pageIndex, pageSize])

    
    return (
	<>
	    <Row>
		<Col lg={3}>
		    <div className='d-flex align-items-center gap-4'>
			<div className='text-nowrap'> Page{' '}
			    <strong>
				{pageIndex + 1} of {pageOptions.length}
			    </strong>{' '}
			</div>
			
			<Form.Select
			    value={pageSize}
			    onChange={e => {
				setPageSize(Number(e.target.value))
			    }}
			>
			    {[10, 20, 30, 40, 50].map(pageSize => (
				<option key={pageSize} value={pageSize}>
				    Show {pageSize}
				</option>
			    ))}
			</Form.Select>
		    </div>

		</Col>
		<Col lg={7}></Col>
		<Col lg={2} className="text-end">
		    <span>
			<Form.Label>Go to page:</Form.Label>
			<Form.Control
			    type="number"
			    defaultValue={pageIndex + 1}
			    onChange={e => {
				const page = e.target.value ? Number(e.target.value) - 1 : 0
				gotoPage(page)
			    }}
			/>
		    </span>
		</Col>

	    </Row>

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
		<tr>
		    {loading ? (
			// Use our custom loading state to show a loading indicator
			<td colSpan="10000">Loading more rows...</td>
		    ) : (
			<td colSpan="10000">
			    Showing {page.length} of {page.length < pageSize ?
						      
							  <>{page.length}</> :
						      <>
							  ~{controlledPageCount * pageSize}
						      </>
						     }
			    {' '}results
			</td>
		    )}
		</tr>
                {page.map((row, i) => {
                    prepareRow(row);
		    const rowProps = row.getRowProps();
                    return (
			<React.Fragment key={i}>
                        <tr  {...row.getRowProps()}>
                            {row.cells.map(cell => {
                                return (
                                    <td
                                        {...cell.getCellProps()}>{cell.render('Cell')}</td>
                                )
                            })}
                        </tr>
			    {row.isExpanded ? (
				showRowExpansion({ row, rowProps, visibleColumns, cveAPI })
                            ) : null}    
			</React.Fragment>
		    )
		})}
	    </tbody>
            </BTable>
	    <div className="d-flex justify-content-center">
		<div className="pagination mt-3 text-center">
			<Button className="px-2 m-1" onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
			    {'<<'}
			</Button>{' '}
			<Button className="px-2 m-1" onClick={() => previousPage()} disabled={!canPreviousPage}>
		{'<'}
			</Button>{' '}
			<Button className="px-2 m-1" onClick={() => nextPage()} disabled={!canNextPage}>
			    {'>'}
			</Button>{' '}
			<Button className="px-2 m-1" onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
			    {'>>'}
			</Button>{' '}
		    </div>
		</div>
	</>
    )
}

export default CVETable;
