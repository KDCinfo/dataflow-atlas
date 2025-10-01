export default class AppUtils {
  // Allows chaining of 'classList' '.add()` and '.remove()'.
  // Usage: classListChain(htmlElement).add('class1').remove('class2');
  // Many thanks to: https://stackoverflow.com/a/29143197/638153 | user663031
  static classListChain(htmlElement: HTMLElement) {
    var elementClassList = htmlElement.classList;
    return {
      toggle: function (c: string) { elementClassList.toggle(c); return this; },
      add: function (c: string) { elementClassList.add(c); return this; },
      remove: function (c: string) { elementClassList.remove(c); return this; }
    };
  }
}
