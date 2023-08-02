import React, { useState, useEffect, useMemo } from 'react';
import BTable from "react-bootstrap/Table";
import {Button, Form, Row, Col} from "react-bootstrap";
import { useTable, useSortBy, useExpanded, usePagination } from 'react-table';
import InfiniteScroll from "react-infinite-scroll-component";

const CVETable = ({columns, data, update, hasMore, showRowExpansion, cveAPI}) => {


    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
	rows,
        prepareRow,
	visibleColumns,
    } = useTable(
        {
            columns,
            data,
        },
        useSortBy,
	useExpanded,
    )

    return (
	    <InfiniteScroll
		dataLength = {rows.length}
		next={update}
		hasMore = {hasMore}
		loader = {<h5 className="mt-3">Loading more...</h5>}
	    >
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
			{(rows.length > 0 && rows.map((row, i) => {
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
			})) ||  <tr><td colSpan={visibleColumns.length} className="text-center">No data ...</td></tr>}
		    </tbody>
		</BTable>
            </InfiniteScroll>
    )
}


export default CVETable;
