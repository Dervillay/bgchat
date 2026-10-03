export const BoardGameSelect = {
  control: (provided: any, state: any, selectedBoardGame: string) => ({
    ...provided,
    border: 'none',
    boxShadow: 'none',
    borderRadius: '1.5rem',
    minWidth: selectedBoardGame ? 'fit-content' : '11.5rem',
    maxWidth: '13rem',
    px: '0.75rem',
    color: 'chakra-body-text',
    fontSize: 'md',
    backgroundColor: 'gray.200',
    cursor: 'pointer',
    _dark: {
      backgroundColor: '#3a3a3a',
    },
    '&:hover': {
      boxShadow: 'none',
      border: 'none',
      cursor: 'pointer',
      filter: 'brightness(0.97)',
    },
    '&:focus-within': {
      boxShadow: 'none',
      border: 'none',
    },
    ...(state.isFocused && {
      border: 'none',
      boxShadow: 'none',
    }),
  }),

  singleValue: (provided: any) => ({
    ...provided,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  }),

  menu: (provided: any) => ({
    ...provided,
    minWidth: { base: '13rem', md: '18rem' },
    borderRadius: '10px',
    left: 0,
    right: 'auto',
    borderColor: 'chakra-body-border',
    zIndex: 1500,
  }),

  menuList: (provided: any) => ({
    ...provided,
    borderRadius: '10px',
    padding: '0.3rem',
    backgroundColor: 'chakra-body-bg',
    maxHeight: '15rem',
    overflowY: 'auto',
    _dark: {
      backgroundColor: 'chakra-body-message-bg',
    }
  }),

  option: (provided: any, state: any) => ({
    ...provided,
    fontWeight: 'normal',
    backgroundColor: 'transparent',
    color: 'chakra-body-text',
    fontSize: 'md',
    '&:hover': {
      backgroundColor: 'gray.100',
      borderRadius: '5px',
    },
    _dark: {
      '&:hover': {
        backgroundColor: 'chakra-body-border',
      },
    },
    ...(state.isSelected && {
      color: 'chakra-body-text-highlight',
    }),
  }),

  placeholder: (provided: any) => ({
    ...provided,
    _dark: {
      color: '#a0a0a0',
    },
  }),
};
