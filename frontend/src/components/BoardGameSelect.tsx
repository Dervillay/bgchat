import { FC } from "react";
import { Select } from "chakra-react-select";
import { theme } from "../theme/index.ts";

interface BoardGameSelectProps {
	selectedBoardGame: string;
	knownBoardGames: string[];
	onSelectBoardGame: (selectedBoardGame: string) => void;
	isDisabled?: boolean;
}

const selectComponents = {
	DropdownIndicator: () => null,
	IndicatorSeparator: () => null,
};

export const BoardGameSelect: FC<BoardGameSelectProps> = ({
	selectedBoardGame,
	knownBoardGames,
	onSelectBoardGame,
	isDisabled = false,
}) => {
	const options = knownBoardGames.map(game => ({
		value: game,
		label: game
	}));

	return (
		<Select
			options={options}
			isMulti={false}
			isDisabled={isDisabled}
			value={selectedBoardGame ? { value: selectedBoardGame, label: selectedBoardGame } : null}
			onChange={(selectedBoardGame) => selectedBoardGame && onSelectBoardGame(selectedBoardGame.value)}
			placeholder="Select a board game…"
			size="sm"
			menuPlacement="top"
			menuPosition="fixed"
			menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
			components={selectComponents}
			// Native react-select styles — chakraStyles.menuPortal often fails to raise z-index,
			// so the menu ends up behind the fixed chat input (z-index 20).
			styles={{
				menuPortal: (base) => ({ ...base, zIndex: 1500 }),
			}}
			chakraStyles={{
				control: (provided, state) => theme.components.BoardGameSelect.control(provided, state, selectedBoardGame),
				singleValue: theme.components.BoardGameSelect.singleValue,
				menu: theme.components.BoardGameSelect.menu,
				menuList: theme.components.BoardGameSelect.menuList,
				option: theme.components.BoardGameSelect.option,
				placeholder: theme.components.BoardGameSelect.placeholder,
			}}
		/>
	);
};
