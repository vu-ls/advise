import React, { useEffect } from "react";
import Pagination from "react-bootstrap/Pagination";

const StandardPagination = ({
    itemsCount,
    itemsPerPage,
    currentPage,
    setCurrentPage,
    alwaysShown = true
}) => {


    const pagesCount = Math.ceil(itemsCount / itemsPerPage);
    const isPaginationShown = alwaysShown ? true : pagesCount > 1;
    const isCurrentPageFirst = currentPage === 1;
    const isCurrentPageLast = currentPage === pagesCount;

    
    const changePage = number => {
	console.log("in changepage");
	if (currentPage === number) return;
	setCurrentPage(number);
    };

    const onPageNumberClick = pageNumber => {
	changePage(pageNumber);
    };

    const onPreviousPageClick = () => {
	changePage(currentPage => currentPage - 1);
    };
    const onNextPageClick = () => {
	changePage(currentPage => currentPage + 1);
    };
    
    const setLastPageAsCurrent = () => {
	console.log(itemsCount)
	console.log(itemsPerPage);
	console.log("currentPage", currentPage);
	console.log("pagesCount", pagesCount);
	if (currentPage > pagesCount) {
	    setCurrentPage(pagesCount);
	}
    };
    
    let isPageNumberOutOfRange;
    
    const pageNumbers = [...new Array(pagesCount)].map((_, index) => {
	const pageNumber = index + 1;
	const isPageNumberFirst = pageNumber === 1;
	const isPageNumberLast = pageNumber === pagesCount;
	const isCurrentPageWithinTwoPageNumbers =
	      Math.abs(pageNumber - currentPage) <= 2;
	
	if (
	    isPageNumberFirst ||
		isPageNumberLast ||
		isCurrentPageWithinTwoPageNumbers
	) {
	    isPageNumberOutOfRange = false;
	    return (
		<Pagination.Item
		    key={pageNumber}
		    onClick={() => onPageNumberClick(pageNumber)}
		    active={pageNumber === currentPage}
		>
		    {pageNumber}
		</Pagination.Item>
	    );
	}
	
        if (!isPageNumberOutOfRange) {
	    isPageNumberOutOfRange = true;
	    return <Pagination.Ellipsis key={pageNumber} className="muted" />;
	}
	
	return null;
    });
    
    useEffect(setLastPageAsCurrent, [pagesCount]);
    
    return (
	<>
	    {isPaginationShown && (
		<Pagination className="justify-content-center">
		    <Pagination.Prev
			onClick={onPreviousPageClick}
			disabled={isCurrentPageFirst}
		    />
		    {pageNumbers}
		    <Pagination.Next
			onClick={onNextPageClick}
			disabled={isCurrentPageLast}
		    />
		</Pagination>
	    )}
	</>
    );
};

/*
StandardPagination.propTypes = {
    itemsCount: PropTypes.number.isRequired,
    currentPage: PropTypes.number.isRequired,
    setCurrentPage: PropTypes.func.isRequired,
    alwaysShown: PropTypes.bool
};
*/
export default StandardPagination;
