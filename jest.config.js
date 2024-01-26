const config = {
    roots: ['<rootDir>/assets/js'],
    moduleNameMapper: {
	'\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
	'<rootDir>/assets/js/__mocks__/fileMock.js',
	'\\.(css|less)$': '<rootDir>/assets/js/__mocks__/styleMock.js',
	'^Components/(.*)$':'<rootDir>/assets/js/$1',
	'^Styles/(.*)$':'<rootDir>/assets/css/$1',
	
    },
    transformIgnorePatterns: ['<rootDir>/node_modules/(?!(ics|jspdf))/'],
    //setupFilesAfterEnv: ['@testing-library/react/cleanup-after-each'],
    testEnvironmentOptions: {'url': "http://localhost:8000"},
    setupFilesAfterEnv: ['<rootDir>/assets/js/setupTests.js', `<rootDir>/jest-shim.js`, 'jest-canvas-mock'],
    testEnvironment: "jsdom",
    verbose: true
};

module.exports = config;

