import MaxPageMain from 'src/pages/max/MaxPageMain.tsx';
import MaxFreezeSub from 'src/pages/max/MaxFreezeSub.tsx';
import MaxPageBelowController from 'src/pages/max/MaxPageBelowController.tsx';

const MaxFreezePage = () => {

  return (
    <div className="w-[100vw] max-w-[100vw] text-sm overflow-x-hidden h-[100vh] relative overflow-y-hidden">
      <MaxPageMain/>
      <MaxFreezeSub/>
      <MaxPageBelowController />
    </div>
  );
};

export default MaxFreezePage;
