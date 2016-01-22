namespace basic {
    /* {help:functions/show-string}
     * {weight:87}
     * {hints:interval:150,100,200,-100}
     * {shim:micro_bit::scrollString}
     */
    /**
     * Display text on the display, one character at a time, and shift by one column each ``interval`` milliseconds. If the string fits on the screen (i.e. is one letter), does not scroll.
     */
    export function showString(text: string, interval: number): void { }

    /**
     * Turn off all LEDs
     * {help:functions/clear-screen}
     * {weight:79}
     * {shim:micro_bit::clearScreen}
     * {atomic}
     */
    export function clearScreen(): void { }

    /**
     * Pause for the specified time in milliseconds
     * {help:functions/pause}
     * {weight:88}
     * {hints:ms:100,200,500,1000,2000}
     * {shim:micro_bit::pause}
     */
    export function pause(ms: number): void { }

    /**
     * Scroll a number on the screen and shift by one column every ``interval`` milliseconds. If the number fits on the screen (i.e. is a single digit), does not scroll.
     * {help:functions/show-number}
     * {namespace:basic}
     * {weight:89}
     * {hints:interval:150,100,200,-100}
     * {shim:micro_bit::scrollNumber}
     */
    export function showNumber(value: number, interval: number): void { }

    /**
     * Get the button state (pressed or not) for ``A`` and ``B``.
     * {help:functions/button-is-pressed}
     * {namespace:input}
     * {weight:59}
     * {enum:name:A=MICROBIT_ID_BUTTON_A,B=MICROBIT_ID_BUTTON_B}
     * {shim:micro_bit::isButtonPressed}
     */
    export function buttonIsPressed(button: Button): boolean { return false; }
}

interface Action {
    (): void;
}

namespace control {
    /**
     * Schedules code that run in the background.
     * {help:functions/in-background}
     * {shim:micro_bit::runInBackground}
     */
    export function inBackground(body: Action): void {}
}

enum Button {
    // {enumval:MICROBIT_ID_BUTTON_A}
    A,
    // {enumval:MICROBIT_ID_BUTTON_A}
    B,
    // {enumval:MICROBIT_ID_BUTTON_AB}
    AB,
}

namespace helpers {
    export function arraySplice<T>(arr:T[], start:number, len:number)
    {
        if (start < 0) return;
        while (len-- > 0)
            arr.removeAt(start)
    }
}
