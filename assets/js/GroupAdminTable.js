import React, { useState, useEffect, useMemo } from 'react';
import BTable from "react-bootstrap/Table";
import { useTable, useExpanded, useSortBy, useRowSelect } from 'react-table';
import InfiniteScroll from "react-infinite-scroll-component";

const GroupAdminTable = ({columns, data, setSelectedRows, fetchData, group, api, loading, update}) => {


    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow,
        selectedFlatRows,
	visibleColumns,
        state: {selectedRowIds}
    } = useTable(
        {
            columns,
            data,
        },
        useSortBy,
	useExpanded,
	useRowSelect,

    )

    useEffect(()=>{
        if (selectedFlatRows) {
            setSelectedRows(selectedFlatRows);
        }
    },[
        setSelectedRows,
        selectedRowIds
    ]);

    useEffect(() => {
	if (group && api) {
	    fetchData({group, api});
	}
    }, [fetchData, group, update]);

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

		{loading ? (
                    // Use our custom loading state to show a loading indicator
                    <tr><td colSpan="1000">Loading more rows...</td></tr>
                ) :
		 (rows.length > 0 && rows.map((row, i) => {
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
			    showRowExpansion({ row, rowProps, visibleColumns })
			) : null}
			</React.Fragment>
		    )
                 })) ||
		 <tr><td colSpan={visibleColumns.length} className="text-center">No contacts found</td></tr>
		}
		 
            </tbody>
        </BTable>
    )
}

export default GroupAdminTable;
