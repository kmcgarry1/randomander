import { computed } from "vue";
import {
  COLOR_CHOICES,
  colorOptions,
  type OptionsState,
} from "../../../stores/randomander";

const colorCountModeOptions: { label: string; value: OptionsState["colorCountMode"] }[] = [
  { label: "Up to", value: "up-to" },
  { label: "Exactly", value: "exactly" },
];

export function useManaFilters(optionsState: OptionsState) {
  const colorChoices = COLOR_CHOICES;
  const colorCountOptions = colorOptions;

  const isColorlessActive = computed(() =>
    optionsState.selectedColors.some((value) => value.toUpperCase() === "C"),
  );

  const setSelectedColors = (colors: string[]) => {
    optionsState.selectedColors.splice(
      0,
      optionsState.selectedColors.length,
      ...colors,
    );
  };

  const isColorSelected = (symbol: string) =>
    optionsState.selectedColors
      .map((color) => color.toUpperCase())
      .includes(symbol.toUpperCase());

  const toggleColorFilter = (symbol: string) => {
    const normalized = symbol.toUpperCase();
    if (normalized === "C") {
      if (isColorlessActive.value) {
        setSelectedColors([]);
      } else {
        setSelectedColors([normalized]);
      }
      return;
    }

    if (isColorlessActive.value) {
      return;
    }

    const currentIndex = optionsState.selectedColors.findIndex(
      (color) => color.toUpperCase() === normalized,
    );

    if (currentIndex >= 0) {
      optionsState.selectedColors.splice(currentIndex, 1);
    } else {
      optionsState.selectedColors.push(normalized);
    }
  };

  return {
    colorChoices,
    colorCountOptions,
    colorCountModeOptions,
    isColorlessActive,
    isColorSelected,
    toggleColorFilter,
  };
}
